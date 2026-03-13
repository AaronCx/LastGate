export interface RepoStatus {
  label: string;
  color: string;
}

export function getStatusFromRuns(
  runs: { status: string; created_at: string }[]
): RepoStatus {
  if (runs.length === 0) {
    return { label: "unknown", color: "#9f9f9f" };
  }

  // Look at the most recent 5 runs (or all if fewer)
  const recent = runs.slice(0, 5);
  const hasFailures = recent.some((r) => r.status === "failed");
  const hasWarnings = recent.some((r) => r.status === "warned");

  if (hasFailures) {
    return { label: "failing", color: "#e05d44" };
  }
  if (hasWarnings) {
    return { label: "warnings", color: "#dfb317" };
  }
  return { label: "passing", color: "#4c1" };
}

export function getDetailedStatus(
  runs: { status: string }[]
): RepoStatus {
  if (runs.length === 0) {
    return { label: "unknown", color: "#9f9f9f" };
  }

  const passed = runs.filter((r) => r.status === "passed").length;
  const total = runs.length;
  const rate = Math.round((passed / total) * 100);

  let color = "#4c1";
  if (rate < 70) color = "#e05d44";
  else if (rate < 90) color = "#dfb317";

  return {
    label: `${passed}/${total} passed | ${rate}%`,
    color,
  };
}
