import type { CheckRunResults } from "@lastgate/engine";

export async function dispatchNotification(
  repoId: string | null,
  results: CheckRunResults,
  options: { urgent?: boolean } = {}
) {
  // For now, just log. Slack/Discord integration can be added later.
  if (options.urgent) {
    console.warn(`[URGENT] LastGate alert for repo ${repoId}: ${results.failureCount} failures detected on direct push`);
  }
}
