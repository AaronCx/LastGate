import * as vscode from "vscode";
import { LastGateClient, type CheckEntry } from "./api/client";
import { getStatusBarText, type StatusBarConfig } from "./statusBar";
import { mapFindingToDiagnostic, groupFindingsByFile, type Finding } from "./diagnostics/mapper";
import { COMMANDS } from "./commands";

let statusBar: vscode.StatusBarItem;
let diagnostics: vscode.DiagnosticCollection;

function getConfig() {
  const cfg = vscode.workspace.getConfiguration("lastgate");
  return {
    apiKey: cfg.get<string>("apiKey") || "",
    dashboardUrl: cfg.get<string>("dashboardUrl") || "https://lastgate.vercel.app",
  };
}

function getClient(): LastGateClient | null {
  const { apiKey, dashboardUrl } = getConfig();
  return apiKey ? new LastGateClient(apiKey, dashboardUrl) : null;
}

class ChecksTreeProvider implements vscode.TreeDataProvider<CheckEntry> {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;
  private entries: CheckEntry[] = [];

  setEntries(entries: CheckEntry[]): void {
    this.entries = entries;
    this._onDidChange.fire();
  }

  getTreeItem(e: CheckEntry): vscode.TreeItem {
    const icon = e.status === "fail" ? "$(error)" : e.status === "warn" ? "$(warning)" : "$(check)";
    const item = new vscode.TreeItem(`${icon} ${e.branch} · ${(e.commitHash || "").slice(0, 7)}`);
    item.description = `${e.failures}F ${e.warnings}W`;
    item.tooltip = `${e.repo} — ${e.status}`;
    item.command = { command: COMMANDS.showFindings, title: "Show findings", arguments: [e.id] };
    return item;
  }

  getChildren(): CheckEntry[] {
    return this.entries;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = getStatusBarText({ status: "unknown" });
  statusBar.command = COMMANDS.runCheck;
  statusBar.show();
  context.subscriptions.push(statusBar);

  diagnostics = vscode.languages.createDiagnosticCollection("lastgate");
  context.subscriptions.push(diagnostics);

  const tree = new ChecksTreeProvider();
  context.subscriptions.push(vscode.window.registerTreeDataProvider("lastgate.checks", tree));

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.runCheck, () => {
      const term = vscode.window.createTerminal("LastGate");
      term.show();
      term.sendText("lastgate check");
      setTimeout(() => void refresh(tree), 4000);
    }),
    vscode.commands.registerCommand(COMMANDS.viewDashboard, () => {
      void vscode.env.openExternal(vscode.Uri.parse(getConfig().dashboardUrl));
    }),
    vscode.commands.registerCommand(COMMANDS.showFindings, (runId?: string) => {
      void showFindings(runId);
    }),
  );

  void refresh(tree);
}

async function refresh(tree: ChecksTreeProvider): Promise<void> {
  const client = getClient();
  if (!client) {
    statusBar.text = getStatusBarText({ status: "unknown" });
    return;
  }
  statusBar.text = getStatusBarText({ status: "loading" });
  try {
    const { entries } = await client.getRecentChecks(20);
    tree.setEntries(entries);
    const latest = entries[0];
    const status: StatusBarConfig["status"] = !latest
      ? "unknown"
      : latest.status === "fail"
        ? "failing"
        : latest.status === "warn"
          ? "warnings"
          : "passing";
    statusBar.text = getStatusBarText({ status });
  } catch {
    statusBar.text = getStatusBarText({ status: "unknown" });
  }
}

async function showFindings(runId?: string): Promise<void> {
  const client = getClient();
  if (!client) {
    void vscode.window.showWarningMessage("Set `lastgate.apiKey` in settings to use LastGate.");
    return;
  }
  if (!runId) {
    try {
      const { entries } = await client.getRecentChecks(1);
      runId = entries[0]?.id;
    } catch {
      /* fall through to the no-run message */
    }
  }
  if (!runId) {
    void vscode.window.showInformationMessage("No LastGate check runs found.");
    return;
  }
  try {
    const { findings } = await client.getCheckFindings(runId);
    diagnostics.clear();
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
    const byFile = groupFindingsByFile(findings as Finding[]);
    for (const [file, fileFindings] of byFile) {
      const uri = folder ? vscode.Uri.joinPath(folder, file) : vscode.Uri.file(file);
      const diags = fileFindings.map((f) => {
        const mapped = mapFindingToDiagnostic(f);
        const range = new vscode.Range(mapped.line, 0, mapped.endLine, 200);
        const diag = new vscode.Diagnostic(
          range,
          mapped.message,
          mapped.severity === "error"
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning,
        );
        diag.source = "LastGate";
        return diag;
      });
      diagnostics.set(uri, diags);
    }
    if (findings.length === 0) {
      void vscode.window.showInformationMessage("LastGate: no findings 🎉");
    } else {
      void vscode.commands.executeCommand("workbench.actions.view.problems");
    }
  } catch (err) {
    void vscode.window.showErrorMessage(
      `LastGate: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export function deactivate(): void {
  diagnostics?.dispose();
  statusBar?.dispose();
}
