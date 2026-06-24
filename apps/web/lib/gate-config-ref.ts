/**
 * The git ref the gate CONFIG must be loaded from. For a pull_request this is the
 * BASE (target) branch — never the PR head — so a PR cannot ship a permissive
 * .lastgate.yml to disable the gate against its own diff. For a push it is the
 * pushed commit (that IS the branch landing). Lives in lib (not the route file)
 * because Next.js only allows route handlers to be exported from route.ts.
 */
export function gateConfigRef(
  event: string,
  payload: Record<string, unknown>,
): string {
  if (event === "push") return payload.after as string;
  const pr = (payload.pull_request as Record<string, unknown>) || {};
  const base = pr.base as Record<string, unknown> | undefined;
  const head = pr.head as Record<string, unknown> | undefined;
  return (base?.sha as string) || (base?.ref as string) || (head?.sha as string);
}
