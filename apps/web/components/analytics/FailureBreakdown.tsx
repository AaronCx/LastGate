"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

interface BreakdownEntry {
  checkType: string;
  count: number;
}

interface FailureBreakdownProps {
  data: BreakdownEntry[];
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"];

const CHECK_TYPE_LABELS: Record<string, string> = {
  secrets: "Secrets",
  lint: "Lint",
  build: "Build",
  duplicates: "Duplicates",
  file_patterns: "Files",
  commit_message: "Commit Msg",
  agent_patterns: "Agent",
  dependencies: "Deps",
};

export default function FailureBreakdown({ data }: FailureBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        No failures to break down
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: CHECK_TYPE_LABELS[d.checkType] || d.checkType,
    value: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
