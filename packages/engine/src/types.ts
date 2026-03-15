export type CheckStatus = "pass" | "warn" | "fail";
export type CheckType =
  | "secrets"
  | "duplicates"
  | "lint"
  | "build"
  | "dependencies"
  | "file_patterns"
  | "commit_message"
  | "agent_patterns";

export interface CheckResult {
  type: CheckType;
  status: CheckStatus;
  title: string;
  summary?: string;
  details: Record<string, unknown>;
  duration_ms?: number;
}

export interface CheckRunResults {
  checks: CheckResult[];
  hasFailures: boolean;
  hasWarnings: boolean;
  failureCount: number;
  warningCount: number;
  summary: string;
  annotations: Annotation[];
}

export interface Annotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: "notice" | "warning" | "failure";
  message: string;
  title: string;
}

export interface ChangedFile {
  path: string;
  content: string;
  patch?: string;
  status: "added" | "modified" | "removed" | "renamed";
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
}

export interface PipelineConfig {
  checks: {
    secrets?: SecretCheckConfig;
    duplicates?: DuplicateCheckConfig;
    lint?: LintCheckConfig;
    build?: BuildCheckConfig;
    dependencies?: DependencyCheckConfig;
    file_patterns?: FilePatternCheckConfig;
    commit_message?: CommitMessageCheckConfig;
    agent_patterns?: AgentPatternCheckConfig;
  };
  protected_branches?: string[];
  notifications?: {
    slack_webhook?: string;
    email?: string;
  };
  agent_feedback?: {
    format: "structured" | "human-readable" | "both";
  };
}

export interface SecretCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  custom_patterns?: Array<{
    name: string;
    pattern: string;
    severity?: "high" | "critical";
  }>;
}

export interface DuplicateCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  lookback: number;
}

export interface LintCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  command?: string;
}

export interface BuildCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  command?: string;
  timeout?: number;
}

export interface DependencyCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  fail_on?: "critical" | "high" | "moderate" | "low";
}

export interface FilePatternCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  block?: string[];
  allow?: string[];
}

export interface CommitMessageCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
  require_conventional: boolean;
}

export interface AgentPatternCheckConfig {
  enabled: boolean;
  severity: "fail" | "warn";
}
