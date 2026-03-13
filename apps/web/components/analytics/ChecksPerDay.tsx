"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface DailyData {
  day: string;
  total: number;
  passed: number;
  failed: number;
}

interface ChecksPerDayProps {
  data: DailyData[];
}

export default function ChecksPerDay({ data }: ChecksPerDayProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        No check data for this period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v) => {
            const d = new Date(v + "T00:00:00");
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          labelFormatter={(label) => {
            const d = new Date(label + "T00:00:00");
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="passed" stackId="a" fill="#10b981" name="Passed" radius={[0, 0, 0, 0]} />
        <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
