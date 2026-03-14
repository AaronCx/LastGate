"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface DailyData {
  day: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface PassRateTrendProps {
  data: DailyData[];
}

export default function PassRateTrend({ data }: PassRateTrendProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        No check data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v) => {
            const d = new Date(v + "T00:00:00");
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value) => [`${value}%`, "Pass Rate"]}
          labelFormatter={(label) => {
            const d = new Date(label + "T00:00:00");
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
        />
        <Line
          type="monotone"
          dataKey="passRate"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: "#10b981" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
