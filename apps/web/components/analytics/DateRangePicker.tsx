"use client";

interface DateRangePickerProps {
  value: string;
  onChange: (range: string) => void;
}

const ranges = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex gap-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
            value === range.value
              ? "bg-lg-accent/20 text-lg-accent"
              : "text-lg-text-muted hover:text-lg-text hover:bg-lg-surface-2"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
