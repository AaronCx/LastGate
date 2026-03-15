import type { Octokit } from "octokit";

export async function configureBranchProtection(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = "main"
) {
  try {
    // Get existing branch protection (if any)
    let existingChecks: string[] = [];
    try {
      const existing = await octokit.request(
        "GET /repos/{owner}/{repo}/branches/{branch}/protection",
        { owner, repo, branch }
      );
      const data = existing.data as Record<string, unknown>;
      const statusChecks = data?.required_status_checks as Record<string, unknown> | undefined;
      existingChecks = (statusChecks?.contexts as string[]) || [];
    } catch {
      // No existing protection — that's fine
    }

    // Add LastGate as a required status check
    const requiredChecks = [...new Set([...existingChecks, "LastGate Pre-flight Check"])];

    await octokit.request(
      "PUT /repos/{owner}/{repo}/branches/{branch}/protection",
      {
        owner,
        repo,
        branch,
        required_status_checks: {
          strict: true, // Require branch to be up to date before merging
          contexts: requiredChecks,
        },
        enforce_admins: false, // Let admins bypass if needed
        required_pull_request_reviews: null, // Don't change PR review settings
        restrictions: null, // Don't change push restrictions
      }
    );

    console.log(`Branch protection configured for ${owner}/${repo}:${branch}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Failed to configure branch protection: ${errorMessage}`);
    // Don't crash — this is a nice-to-have, not a blocker
    // The check will still show on GitHub even without branch protection
  }
}

export async function checkBranchProtection(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string = "main"
): Promise<boolean> {
  try {
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/branches/{branch}/protection",
      { owner, repo, branch }
    );
    const data = response.data as Record<string, unknown>;
    const statusChecks = data?.required_status_checks as Record<string, unknown> | undefined;
    const contexts = (statusChecks?.contexts as string[]) || undefined;
    return contexts?.includes("LastGate Pre-flight Check") ?? false;
  } catch {
    return false;
  }
}
