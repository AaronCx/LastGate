export interface AutoFixConfig {
  enabled: boolean;
  fixes: {
    remove_blocked_files: boolean;
    update_gitignore: boolean;
    trailing_whitespace: boolean;
    eof_newline: boolean;
    linter_autofix: boolean;
  };
  protected_branches: string[];
  require_approval: boolean;
}

export interface FixAction {
  type: "remove_file" | "update_gitignore" | "fix_whitespace" | "fix_eof" | "linter_fix";
  file: string;
  description: string;
}

export interface AutoFixResult {
  applied: FixAction[];
  skipped: FixAction[];
  error?: string;
}
