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

interface AgentEntry {
  author: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface AgentReliabilityProps {
  data: AgentEntry[];
}

export default function AgentReliability({ data }: AgentReliabilityProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        No agent commits in this period
      </div>
    );
  }

  const chartData = data.slice(0, 10).map((d) => ({
    name: d.author.length > 15 ? d.author.slice(0, 15) + "..." : d.author,
    passed: d.passed,
    failed: d.failed,
    passRate: d.passRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="passed" fill="#10b981" name="Passed" radius={[0, 0, 0, 0]} />
        <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
