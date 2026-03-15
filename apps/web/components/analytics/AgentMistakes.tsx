"use client";

interface MistakeEntry {
  checkType: string;
  count: number;
  percentage: number;
}

interface AgentMistakesProps {
  data: MistakeEntry[];
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

export default function AgentMistakes({ data }: AgentMistakesProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-lg-text-muted">
        No agent mistakes recorded
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((entry) => (
        <div
          key={entry.checkType}
          className="flex items-center justify-between p-3 rounded-lg bg-lg-surface-2"
        >
          <div>
            <p className="text-sm font-medium text-lg-text-secondary">
              {CHECK_TYPE_LABELS[entry.checkType] || entry.checkType}
            </p>
            <p className="text-xs text-lg-text-muted">
              {entry.count} occurrence{entry.count !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-red-500">{entry.percentage}%</p>
            <p className="text-xs text-lg-text-muted">of agent runs</p>
          </div>
        </div>
      ))}
    </div>
  );
}
