import cors from "cors";
import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { z } from "zod";
import { prisma } from "./lib/prisma.js";
import { requireAdmin, requireAuth } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";

const env = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
  })
  .parse(process.env);

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8080",
  ],  }),
);
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", authRouter);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Moonstar Restaurant API",
    version: "1.0.0",
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      api: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res
      .status(503)
      .json({ success: false, api: "ok", database: "unavailable" });
  }
});

// Categories
app.get("/api/menu/categories", async (_req, res) => {
  const categories = await prisma.menuCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  res.json({ success: true, data: categories });
});

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
});

app.post("/api/menu/categories", requireAuth, requireAdmin, async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid category name." });
    return;
  }

  const slug = parsed.data.name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) {
    res
      .status(400)
      .json({
        success: false,
        message: "Category name must contain letters or numbers.",
      });
    return;
  }

  const category = await prisma.menuCategory.create({
    data: { name: parsed.data.name, slug },
  });

  res.status(201).json({ success: true, data: category });
});

// Menu items
app.get("/api/menu/items", async (req, res) => {
  const query = z
    .object({
      search: z.string().optional(),
      categoryId: z.string().uuid().optional(),
      available: z.enum(["true", "false"]).optional(),
    })
    .safeParse(req.query);

  if (!query.success) {
    res.status(400).json({ success: false, message: "Invalid menu filters." });
    return;
  }

  const { search, categoryId, available } = query.data;

  const items = await prisma.menuItem.findMany({
    where: {
      ...(search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(available ? { isAvailable: available === "true" } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: items });
});

const menuItemSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().max(5000).nullable().optional(),
  price: z.coerce.number().positive().max(99999999.99),
  imageUrl: z.string().url().nullable().optional(),
  isAvailable: z.boolean().optional(),
  categoryId: z.string().uuid(),
});

app.post("/api/menu/items", requireAuth, requireAdmin, async (req, res) => {
  const parsed = menuItemSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid menu item. Check name, price, image URL and category.",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const category = await prisma.menuCategory.findUnique({
    where: { id: parsed.data.categoryId },
  });

  if (!category || !category.isActive) {
    res
      .status(400)
      .json({ success: false, message: "Active category not found." });
    return;
  }

  const item = await prisma.menuItem.create({
    data: parsed.data,
    include: { category: true },
  });

  res.status(201).json({ success: true, data: item });
});

app.patch("/api/menu/items/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  const parsed = menuItemSchema.partial().safeParse(req.body);

  if (
    !id.success ||
    !parsed.success ||
    Object.keys(req.body ?? {}).length === 0
  ) {
    res
      .status(400)
      .json({ success: false, message: "Invalid item ID or update data." });
    return;
  }

  if (parsed.data.categoryId) {
    const category = await prisma.menuCategory.findUnique({
      where: { id: parsed.data.categoryId },
    });

    if (!category || !category.isActive) {
      res
        .status(400)
        .json({ success: false, message: "Active category not found." });
      return;
    }
  }

  const item = await prisma.menuItem.update({
    where: { id: id.data },
    data: parsed.data,
    include: { category: true },
  });

  res.json({ success: true, data: item });
});

app.delete("/api/menu/items/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);

  if (!id.success) {
    res.status(400).json({ success: false, message: "Invalid menu item ID." });
    return;
  }

  await prisma.menuItem.delete({ where: { id: id.data } });
  res.json({ success: true, message: "Menu item deleted." });
});

// ==================== ORDERS API ====================

// GET /api/orders
app.get("/api/orders", requireAuth, async (req, res) => {
  const statusSchema = z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "COMPLETED",
    "CANCELLED",
  ]);

  const status = req.query.status;
  const search = String(req.query.search ?? "").trim();

  if (status && !statusSchema.safeParse(status).success) {
    res.status(400).json({
      success: false,
      message: "Invalid order status.",
    });
    return;
  }

  const orders = await prisma.order.findMany({
    where: {
      ...(status
        ? {
            status: status as
              | "PENDING"
              | "CONFIRMED"
              | "PREPARING"
              | "READY"
              | "COMPLETED"
              | "CANCELLED",
          }
        : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { customerName: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      items: {
        include: {
          menuItem: {
            select: { id: true, name: true, imageUrl: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

// GET /api/orders/:id
app.get("/api/orders/:id", requireAuth, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);

  if (!id.success) {
    res.status(400).json({
      success: false,
      message: "Invalid order ID.",
    });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: id.data },
    include: {
      items: {
        include: {
          menuItem: {
            select: { id: true, name: true, imageUrl: true },
          },
        },
      },
    },
  });

  if (!order) {
    res.status(404).json({
      success: false,
      message: "Order not found.",
    });
    return;
  }

  res.json({ success: true, data: order });
});

// PATCH /api/orders/:id/status
app.patch("/api/orders/:id/status", requireAuth, async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);

  const body = z
    .object({
      status: z.enum([
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "COMPLETED",
        "CANCELLED",
      ]),
    })
    .safeParse(req.body);

  if (!id.success) {
    res.status(400).json({
      success: false,
      message: "Invalid order ID.",
    });
    return;
  }

  if (!body.success) {
    res.status(400).json({
      success: false,
      message: "Invalid order status.",
    });
    return;
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id: id.data },
    select: { id: true },
  });

  if (!existingOrder) {
    res.status(404).json({
      success: false,
      message: "Order not found.",
    });
    return;
  }

  const order = await prisma.order.update({
    where: { id: id.data },
    data: { status: body.data.status },
    include: {
      items: {
        include: {
          menuItem: {
            select: { id: true, name: true, imageUrl: true },
          },
        },
      },
    },
  });

  res.json({
    success: true,
    message: "Order status updated.",
    data: order,
  });
});

// POST /api/orders — Create a test/customer order
app.post("/api/orders", async (req, res) => {
  const schema = z.object({
    customerName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(5).max(30),
    notes: z.string().trim().max(2000).optional().nullable(),
    items: z
      .array(
        z.object({
          menuItemId: z.string().uuid(),
          quantity: z.number().int().min(1).max(100),
        }),
      )
      .min(1),
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Invalid order data.",
      errors: parsed.error.flatten(),
    });
    return;
  }

  const { customerName, phone, notes, items } = parsed.data;

  const order = await prisma
    .$transaction(async (tx) => {
      const itemIds = [...new Set(items.map((item) => item.menuItemId))];

      const menuItems = await tx.menuItem.findMany({
        where: {
          id: { in: itemIds },
          isAvailable: true,
          category: { isActive: true },
        },
      });

      if (menuItems.length !== itemIds.length) {
        throw new Error("INVALID_OR_UNAVAILABLE_MENU_ITEM");
      }

      const priceById = new Map(
        menuItems.map((item) => [item.id, Number(item.price)]),
      );

      const total = items.reduce((sum, item) => {
        const price = priceById.get(item.menuItemId);
        if (price === undefined) {
          throw new Error("INVALID_OR_UNAVAILABLE_MENU_ITEM");
        }
        return sum + price * item.quantity;
      }, 0);

      const orderNumber = `MS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      return tx.order.create({
        data: {
          orderNumber,
          customerName,
          phone,
          notes: notes || null,
          total: total.toFixed(2),
          items: {
            create: items.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: priceById.get(item.menuItemId)!.toFixed(2),
            })),
          },
        },
        include: {
          items: {
            include: {
              menuItem: { select: { id: true, name: true, imageUrl: true } },
            },
          },
        },
      });
    })
    .catch((error: unknown) => {
      if (
        error instanceof Error &&
        error.message === "INVALID_OR_UNAVAILABLE_MENU_ITEM"
      ) {
        return null;
      }
      throw error;
    });

  if (!order) {
    res.status(400).json({
      success: false,
      message: "A menu item is invalid or unavailable.",
    });
    return;
  }

  res.status(201).json({ success: true, data: order });
});

// ==================== 7-DAY REVENUE ====================

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

function getDhakaDateKey(date: Date): string {
  return new Date(date.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

function getDhakaMidnightUtc(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+06:00`);
}

// ==================== 7-DAY REVENUE ====================

app.get("/api/dashboard/revenue", requireAuth, async (_req, res) => {
  const todayKey = getDhakaDateKey(new Date());
  const todayMidnightUtc = getDhakaMidnightUtc(todayKey);
  const startDate = new Date(
    todayMidnightUtc.getTime() - 6 * 24 * 60 * 60 * 1000,
  );

  const rows = await prisma.$queryRaw<{ date: string; revenue: number }[]>`
    SELECT
      TO_CHAR(
        (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka',
        'YYYY-MM-DD'
      ) AS date,
      COALESCE(SUM(total), 0)::float8 AS revenue
    FROM orders
    WHERE status = 'COMPLETED'
      AND created_at >= ${startDate}
      AND created_at < ${new Date(todayMidnightUtc.getTime() + 24 * 60 * 60 * 1000)}
    GROUP BY 1
  `;

  const revenueByDate = new Map(
    rows.map((row) => [row.date, Number(row.revenue)]),
  );

  const data = Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(
      startDate.getTime() + index * 24 * 60 * 60 * 1000,
    );

    const date = getDhakaDateKey(dayStart);

    return {
      date,
      revenue: revenueByDate.get(date) ?? 0,
    };
  });

  res.json({ success: true, data });
});

// ==================== DASHBOARD STATS ====================

app.get("/api/dashboard/stats", requireAuth, async (_req, res) => {
  const todayKey = getDhakaDateKey(new Date());
  const startOfToday = getDhakaMidnightUtc(todayKey);
  const [
    totalOrders,
    todayOrders,
    pendingOrders,
    revenue,
    recentOrders,
    popularGroups,
  ] = await Promise.all([
    prisma.order.count(),

    prisma.order.count({
      where: { createdAt: { gte: startOfToday } },
    }),

    prisma.order.count({
      where: {
        status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
      },
    }),

    prisma.order.aggregate({
      where: { status: "COMPLETED" },
      _sum: { total: true },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        status: true,
        total: true,
        createdAt: true,
      },
    }),

    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const popularIds = popularGroups.map((item) => item.menuItemId);
  const menuItems = popularIds.length
    ? await prisma.menuItem.findMany({
        where: { id: { in: popularIds } },
        select: { id: true, name: true, price: true, imageUrl: true },
      })
    : [];

  const menuItemById = new Map(menuItems.map((item) => [item.id, item]));

  const popularItems = popularGroups.flatMap((group) => {
    const item = menuItemById.get(group.menuItemId);
    return item
      ? [
          {
            ...item,
            quantitySold: group._sum.quantity ?? 0,
          },
        ]
      : [];
  });

  res.json({
    success: true,
    data: {
      totalOrders,
      todayOrders,
      pendingOrders,
      revenue: Number(revenue._sum.total ?? 0),
      recentOrders,
      popularItems,
    },
  });
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err?.code === "P2025") {
    res.status(404).json({ success: false, message: "Record not found." });
    return;
  }

  if (err?.code === "P2002") {
    res
      .status(409)
      .json({
        success: false,
        message: "A record with this value already exists.",
      });
    return;
  }

  if (err?.code === "P2003") {
    res.status(409).json({
      success: false,
      message: "This record is referenced by other data and cannot be deleted.",
    });
    return;
  }

  console.error("Unhandled request error:", err);
  res.status(500).json({
    success: false,
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  });
};

app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  console.log(`Moonstar API listening on http://localhost:${env.PORT}`);
});

function shutdown() {
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
