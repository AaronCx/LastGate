"use client";

import { cn } from "@/lib/utils";

const ranges = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
] as const;

interface DateRangePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
            value === range.value
              ? "bg-gray-900 text-white"
              : "text-gray-500 hover:text-gray-900"
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
