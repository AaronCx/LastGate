import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getInstallationOctokit } from "@/lib/github/app";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
    if (!installationId) {
      return NextResponse.json(
        { error: "GITHUB_APP_INSTALLATION_ID not configured" },
        { status: 500 }
      );
    }

    const octokit = await getInstallationOctokit(Number(installationId));
    const supabase = createServerSupabaseClient();

    // Fetch all repos accessible to this installation
    const repos: Array<{ id: number; full_name: string; default_branch: string }> = [];
    let page = 1;
    while (true) {
      const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
        per_page: 100,
        page,
      });

      for (const repo of data.repositories) {
        repos.push({
          id: repo.id,
          full_name: repo.full_name,
          default_branch: repo.default_branch || "main",
        });
      }

      if (repos.length >= data.total_count) break;
      page++;
    }

    // Upsert all repos into the database
    let synced = 0;
    for (const repo of repos) {
      const { error } = await supabase
        .from("repos")
        .upsert(
          {
            github_repo_id: repo.id,
            full_name: repo.full_name,
            default_branch: repo.default_branch,
            installation_id: Number(installationId),
            is_active: true,
            config: {
              checks: {
                secrets: { enabled: true },
                duplicates: { enabled: true },
                lint: { enabled: true },
                build: { enabled: false },
                dependencies: { enabled: true },
                patterns: { enabled: true },
              },
            },
          },
          { onConflict: "full_name" }
        );

      if (!error) synced++;
    }

    return NextResponse.json({
      synced,
      total: repos.length,
      repos: repos.map((r) => r.full_name),
    });
  } catch (error) {
    console.error("Repo sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
