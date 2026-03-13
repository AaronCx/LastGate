export interface PreCheckInput {
  files: {
    path: string;
    content: string;
    status: "added" | "modified" | "deleted";
  }[];
  commit_message?: string;
  repo?: string;
}

export interface StatusInput {
  repo: string;
}

export interface ConfigInput {
  repo: string;
}

export interface HistoryInput {
  repo: string;
  limit?: number;
}

export interface ToolResult {
  content: { type: "text"; text: string }[];
}
