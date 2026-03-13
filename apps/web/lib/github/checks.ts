import { getInstallationOctokit } from "./app";

interface CreateCheckRunParams {
  installationId: number;
  owner: string;
  repo: string;
  headSha: string;
  name: string;
}

interface UpdateCheckRunParams {
  installationId: number;
  owner: string;
  repo: string;
  checkRunId: number;
  status: "queued" | "in_progress" | "completed";
  conclusion?:
    | "action_required"
    | "cancelled"
    | "failure"
    | "neutral"
    | "success"
    | "skipped"
    | "timed_out";
  output?: {
    title: string;
    summary: string;
    text?: string;
    annotations?: Array<{
      path: string;
      start_line: number;
      end_line: number;
      annotation_level: "notice" | "warning" | "failure";
      message: string;
      title?: string;
    }>;
  };
}

export async function createCheckRun(params: CreateCheckRunParams) {
  const octokit = await getInstallationOctokit(params.installationId);

  const response = await octokit.request(
    "POST /repos/{owner}/{repo}/check-runs",
    {
      owner: params.owner,
      repo: params.repo,
      name: params.name,
      head_sha: params.headSha,
      status: "in_progress",
      started_at: new Date().toISOString(),
    }
  );

  return response.data;
}

export async function updateCheckRun(params: UpdateCheckRunParams) {
  const octokit = await getInstallationOctokit(params.installationId);

  const response = await octokit.request(
    "PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}",
    {
      owner: params.owner,
      repo: params.repo,
      check_run_id: params.checkRunId,
      status: params.status,
      conclusion: params.conclusion,
      completed_at:
        params.status === "completed" ? new Date().toISOString() : undefined,
      output: params.output,
    }
  );

  return response.data;
}
