export interface ChangedFile {
  path: string;
  content: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions?: number;
  deletions?: number;
}

export interface CheckContext {
  repoFullName: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  commitAuthor: string;
  config: Record<string, unknown>;
}

export interface CheckFinding {
  file: string;
  line?: number;
  message: string;
  suggestedFix?: string;
}

export interface CheckResult {
  status: "pass" | "warn" | "fail";
  title: string;
  findings?: CheckFinding[];
}

export interface CustomCheck {
  name: string;
  description: string;
  severity: "warn" | "fail";
  run(files: ChangedFile[], context: CheckContext): Promise<CheckResult>;
}
