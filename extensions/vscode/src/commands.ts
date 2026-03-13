// Command definitions for LastGate VS Code extension

export const COMMANDS = {
  runCheck: "lastgate.runCheck",
  viewDashboard: "lastgate.viewDashboard",
  showFindings: "lastgate.showFindings",
} as const;

export type CommandId = (typeof COMMANDS)[keyof typeof COMMANDS];

export function getCommandTitle(command: CommandId): string {
  switch (command) {
    case COMMANDS.runCheck:
      return "LastGate: Run Check";
    case COMMANDS.viewDashboard:
      return "LastGate: View Dashboard";
    case COMMANDS.showFindings:
      return "LastGate: Show Findings";
  }
}
