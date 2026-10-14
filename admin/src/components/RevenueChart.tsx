import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { apiRequest } from "../lib/api";

type RevenueDay = {
  date: string;
  revenue: number;
};

type RevenueResponse = {
  success: boolean;
  data: RevenueDay[];
};

export default function RevenueChart() {
  const [data, setData] = useState<RevenueDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<RevenueResponse>("/dashboard/revenue")
      .then((response) => setData(response.data))
      .catch(() => setError("Revenue chart load করা যায়নি।"))
      .finally(() => setLoading(false));
  }, []);

  const chartData = data.map((item) => ({
    ...item,
    day: new Date(`${item.date}T12:00:00`).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
  }));

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 22,
        marginBottom: 24,
      }}
    >
      <h2 style={{ margin: "0 0 6px", fontSize: 19 }}>
        Revenue Overview
      </h2>
      <p style={{ color: "#6b7280", margin: "0 0 22px", fontSize: 13 }}>
        Last 7 days · Cancelled orders excluded
      </p>

      {loading ? (
        <p>Loading revenue...</p>
      ) : error ? (
        <p style={{ color: "#dc2626" }}>{error}</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `৳${value}`}
              width={65}
            />
            <Tooltip
              formatter={(value) => [`৳${Number(value).toLocaleString()}`, "Revenue"]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#16a34a"
              strokeWidth={3}
              fill="url(#revenueFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
