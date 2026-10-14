import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import RevenueChart from "./RevenueChart";

type DashboardStats = {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  revenue: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    status: string;
    total: string | number;
    createdAt: string;
  }[];
  popularItems: {
    id: string;
    name: string;
    price: string | number;
    imageUrl: string | null;
    quantitySold: number;
  }[];
};

const money = (value: number | string) =>
  `৳${Number(value).toLocaleString("en-BD")}`;

export default function DashboardLive() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest<{
        success: boolean;
        data: DashboardStats;
      }>("/dashboard/stats");

      setStats(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Intentional initial dashboard data fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStats();
  }, [loadStats]);

  const panel: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5eaf1",
    borderRadius: 14,
    padding: 20,
    minWidth: 0,
  };

  const heading: React.CSSProperties = {
    fontSize: 13,
    color: "#64748b",
    margin: 0,
  };

  const number: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 750,
    color: "#172033",
    margin: "12px 0 0",
  };

  return (
    <section style={{ display: "grid", gap: 22 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Live Dashboard</h2>
          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Restaurant performance from your database.
          </p>
        </div>

        <button
          type="button"
          className="button button-secondary"
          onClick={() => void loadStats()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh data"}
        </button>
      </div>

      {error && (
        <div role="alert" style={{ color: "#b91c1c", ...panel }}>
          {error}
          <button
            type="button"
            onClick={() => void loadStats()}
            style={{ marginLeft: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && !stats && <p>Loading dashboard data...</p>}

      {stats && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
            }}
          >
            <article style={panel}>
              <p style={heading}>Total orders</p>
              <p style={number}>{stats.totalOrders.toLocaleString()}</p>
            </article>

            <article style={panel}>
              <p style={heading}>Today's orders</p>
              <p style={number}>{stats.todayOrders.toLocaleString()}</p>
            </article>

            <article style={panel}>
              <p style={heading}>Pending orders</p>
              <p style={number}>{stats.pendingOrders.toLocaleString()}</p>
            </article>

            <article style={panel}>
              <p style={heading}>Revenue (excluding cancelled)</p>
              <p style={{ ...number, color: "#13865c" }}>
                {money(stats.revenue)}
              </p>
            </article>
          </div>

          <div style={{ ...panel, overflowX: "auto" }}>
            <h3 style={{ marginTop: 0 }}>Recent orders</h3>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#64748b" }}>
                  {["Order", "Customer", "Status", "Total", "Date"].map(
                    (label) => (
                      <th key={label} style={{ padding: 12, fontSize: 12 }}>
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} style={{ borderTop: "1px solid #edf2f7" }}>
                    <td style={{ padding: 12 }}>{order.orderNumber}</td>
                    <td style={{ padding: 12 }}>{order.customerName}</td>
                    <td style={{ padding: 12 }}>{order.status}</td>
                    <td style={{ padding: 12 }}>{money(order.total)}</td>
                    <td style={{ padding: 12 }}>
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {stats.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 20, textAlign: "center" }}>
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={panel}>
            <h3 style={{ marginTop: 0 }}>Popular menu items</h3>

            {stats.popularItems.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "13px 0",
                  borderBottom:
                    index === stats.popularItems.length - 1
                      ? "none"
                      : "1px solid #edf2f7",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: "#f1f5f9",
                    display: "grid",
                    placeItems: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    "🍽️"
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <strong>{item.name}</strong>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {money(item.price)}
                  </div>
                </div>

                <span style={{ color: "#64748b", fontSize: 13 }}>
                  Sold: {item.quantitySold}
                </span>
              </div>
            ))}

            {stats.popularItems.length === 0 && (
              <p style={{ color: "#64748b" }}>No sales data yet.</p>
            )}
          </div>
        </>
      )}
      <RevenueChart />
    </section>

  );
}
