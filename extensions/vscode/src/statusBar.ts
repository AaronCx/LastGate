// VS Code Status Bar Item for LastGate
// Shows persistent status: $(shield) LastGate: passing/failing/warnings

export interface StatusBarConfig {
  status: "passing" | "failing" | "warnings" | "unknown" | "loading";
}

export function getStatusBarText(config: StatusBarConfig): string {
  const icon = "$(shield)";
  switch (config.status) {
    case "passing":
      return `${icon} LastGate: passing`;
    case "failing":
      return `${icon} LastGate: failing`;
    case "warnings":
      return `${icon} LastGate: warnings`;
    case "loading":
      return `${icon} LastGate: loading...`;
    default:
      return `${icon} LastGate: unknown`;
  }
}

export function getStatusBarColor(status: string): string {
  switch (status) {
    case "passing":
      return "statusBarItem.foreground";
    case "failing":
      return "errorForeground";
    case "warnings":
      return "warningForeground";
    default:
      return "statusBarItem.foreground";
  }
}
