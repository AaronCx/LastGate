"use client";

interface FailureEntry {
  checkType: string;
  count: number;
}

interface TopFailuresProps {
  data: FailureEntry[];
}

const CHECK_TYPE_LABELS: Record<string, string> = {
  secrets: "Secret Detection",
  lint: "Lint Errors",
  build: "Build Failures",
  duplicates: "Duplicate Commits",
  file_patterns: "Blocked Files",
  commit_message: "Bad Commit Messages",
  agent_patterns: "Agent Behavior",
  dependencies: "Dependency Issues",
};

export default function TopFailures({ data }: TopFailuresProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        No failures in this period
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((entry) => (
        <div key={entry.checkType} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              {CHECK_TYPE_LABELS[entry.checkType] || entry.checkType}
            </span>
            <span className="text-gray-500">{entry.count}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full transition-all"
              style={{ width: `${(entry.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
