/**
 * Full names of the repos to act on for an `installation` (created) or
 * `installation_repositories` (added) webhook event. Lives in lib (not the route
 * file) so it's importable + testable.
 */
export function installRepoList(
  event: string,
  payload: Record<string, unknown>,
): string[] {
  const arr = (event === "installation"
    ? payload.repositories
    : payload.repositories_added) as Array<Record<string, unknown>> | undefined;
  return (arr ?? [])
    .map((r) => r?.full_name as string)
    .filter((n): n is string => typeof n === "string" && n.length > 0);
}
