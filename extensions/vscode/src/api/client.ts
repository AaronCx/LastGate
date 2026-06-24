export interface CheckEntry {
  id: string;
  repo: string;
  branch: string;
  status: "pass" | "fail" | "warn";
  checksRun: number;
  failures: number;
  warnings: number;
  timestamp: string;
  commitHash: string;
}

export interface RunFinding {
  file: string;
  line?: number;
  message: string;
  checkType: string;
  status: "fail" | "warn";
}

export interface RunDetails {
  run: {
    id: string;
    status: string;
    branch: string;
    commit_sha: string;
    total_checks: number;
    failed_checks: number;
    created_at: string;
  };
  findings: RunFinding[];
}

export class LastGateClient {
  constructor(
    private apiKey: string,
    private baseUrl: string = "https://lastgate.vercel.app",
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
      throw new Error(`LastGate API error: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  /** Recent check runs (bearer-authed; was wrongly hitting the cookie-only /checks). */
  async getRecentChecks(limit = 10): Promise<{ entries: CheckEntry[] }> {
    return this.request("/cli/checks", { limit: String(limit) });
  }

  /** A single run's findings, for diagnostics. */
  async getCheckFindings(id: string): Promise<RunDetails> {
    return this.request(`/cli/checks/${encodeURIComponent(id)}`);
  }
}
