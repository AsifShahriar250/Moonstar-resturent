import { Router } from "express";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email().max(255).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(200),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Please provide a valid email and password.",
    });
    return;
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
      tokenVersion: true,
    },
  });

  // Use the same response for an unknown email and an incorrect password.
  if (!user || !user.isActive || !(await compare(password, user.passwordHash))) {
    res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  const token = await new SignJWT({ role: user.role, ver: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("moonstar-api")
    .setAudience("moonstar-admin")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));

  res.json({
    success: true,
    data: {
      token,
      expiresIn: 3600,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

router.get("/me", requireAuth, async (_req, res) => {
  const authUser = res.locals.authUser as
    | { id: string; role: "ADMIN" | "STAFF" }
    | undefined;

  if (!authUser) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Account is unavailable.",
    });
    return;
  }

  res.json({ success: true, data: { user } });
});


router.post("/logout", requireAuth, async (_req, res) => {
  const authUser = res.locals.authUser as
    | { id: string; role: "ADMIN" | "STAFF" }
    | undefined;

  if (!authUser) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  await prisma.user.update({
    where: { id: authUser.id },
    data: { tokenVersion: { increment: 1 } },
  });

  res.json({
    success: true,
    message: "Logged out successfully.",
  });
});

export default router;
