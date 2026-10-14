import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: string | number;
  menuItem: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
};

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  status: OrderStatus;
  total: string | number;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
};

type OrdersResponse = {
  success: boolean;
  count: number;
  data: Order[];
};

const statuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const money = (value: string | number) =>
  `৳${Number(value).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function OrdersManagement({
  onNotice,
}: {
  onNotice: (message: string) => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selected, setSelected] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams();

      if (search.trim()) query.set("search", search.trim());
      if (statusFilter !== "ALL") query.set("status", statusFilter);

      const suffix = query.toString() ? `?${query.toString()}` : "";
      const result = await apiRequest<OrdersResponse>(`/orders${suffix}`);

      setOrders(result.data);

      setSelected((previous) =>
        previous
          ? result.data.find((order) => order.id === previous.id) ?? null
          : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    // Intentional fetch when the component mounts or filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOrders();
  }, [loadOrders]);

  async function updateStatus(order: Order, status: OrderStatus) {
    if (status === order.status) return;

    setUpdatingId(order.id);
    setError("");

    try {
      await apiRequest(`/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      onNotice(`Order ${order.orderNumber} updated to ${statusLabels[status]}.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <div>
        <h2 style={{ margin: 0 }}>Orders Management</h2>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          View customer orders and manage their status.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <input
          aria-label="Search orders"
          placeholder="Search order, customer or phone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{
            flex: "1 1 260px",
            minWidth: 0,
            padding: "12px 14px",
            border: "1px solid #dbe2ea",
            borderRadius: 10,
          }}
        />

        <select
          aria-label="Filter order status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{
            padding: "12px 14px",
            border: "1px solid #dbe2ea",
            borderRadius: 10,
            background: "white",
          }}
        >
          <option value="ALL">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="button button-secondary"
          onClick={() => void loadOrders()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      <div
        style={{
          overflowX: "auto",
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", textAlign: "left" }}>
              {["Order", "Customer", "Items", "Total", "Status", "Details"].map(
                (heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: 14,
                      fontSize: 12,
                      color: "#64748b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {!loading && orders.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: 30, textAlign: "center", color: "#64748b" }}
                >
                  No orders found. Orders will appear here when available.
                </td>
              </tr>
            )}

            {orders.map((order) => (
              <tr key={order.id} style={{ borderTop: "1px solid #edf2f7" }}>
                <td style={{ padding: 14, whiteSpace: "nowrap" }}>
                  <strong>{order.orderNumber}</strong>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    {new Date(order.createdAt).toLocaleString()}
                  </div>
                </td>

                <td style={{ padding: 14, minWidth: 150 }}>
                  <strong>{order.customerName}</strong>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {order.phone}
                  </div>
                </td>

                <td style={{ padding: 14 }}>{order.items.length}</td>
                <td style={{ padding: 14, whiteSpace: "nowrap" }}>
                  {money(order.total)}
                </td>

                <td style={{ padding: 14, minWidth: 150 }}>
                  <select
                    aria-label={`Status for ${order.orderNumber}`}
                    value={order.status}
                    disabled={updatingId === order.id}
                    onChange={(event) =>
                      void updateStatus(order, event.target.value as OrderStatus)
                    }
                    style={{
                      maxWidth: "100%",
                      padding: "8px 10px",
                      border: "1px solid #dbe2ea",
                      borderRadius: 8,
                      background: "white",
                    }}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={{ padding: 14 }}>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setSelected(order)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Order details ${selected.orderNumber}`}
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3 style={{ marginTop: 0 }}>Order {selected.orderNumber}</h3>
              <p>{selected.customerName} · {selected.phone}</p>
            </div>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>

          <p>
            <strong>Status:</strong> {statusLabels[selected.status]}
          </p>

          <h4>Order items</h4>
          {selected.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                padding: "10px 0",
                borderBottom: "1px solid #edf2f7",
              }}
            >
              <span>
                {item.menuItem.name} × {item.quantity}
              </span>
              <strong>{money(Number(item.unitPrice) * item.quantity)}</strong>
            </div>
          ))}

          {selected.notes && <p><strong>Notes:</strong> {selected.notes}</p>}

          <h3 style={{ textAlign: "right" }}>Total: {money(selected.total)}</h3>
        </div>
      )}
    </section>
  );
}
