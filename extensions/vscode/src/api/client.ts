export interface CheckRun {
  id: string;
  status: string;
  commit_sha: string;
  branch: string;
  commit_message: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  created_at: string;
}

export interface CheckResult {
  id: string;
  check_type: string;
  status: string;
  title: string;
  summary: string;
  details: {
    findings?: { file: string; line?: number; message: string }[];
  };
}

export class LastGateClient {
  constructor(
    private apiKey: string,
    private baseUrl: string = "https://lastgate.vercel.app"
  ) {}

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`/api${path}`, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async getRecentChecks(repo?: string, limit: number = 10): Promise<{ data: CheckRun[] }> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (repo) params.repo = repo;
    return this.request("/checks", params);
  }

  async getCheckDetails(id: string): Promise<{ data: CheckRun & { results: CheckResult[] } }> {
    return this.request(`/checks/${id}`);
  }

  async getRepoStatus(repo: string): Promise<{ status: string; passRate: number }> {
    return this.request(`/analytics/repos/${repo}`, { range: "7d" });
  }
}
