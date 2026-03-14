import { Command } from "commander";
import { mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { homedir } from "os";
import { success, error, dim, bold, info } from "../output/colors";

const CONFIG_DIR = resolve(homedir(), ".lastgate");
const CONFIG_PATH = resolve(CONFIG_DIR, "config.json");
const DASHBOARD_LOGIN_URL = `${process.env.LASTGATE_API_URL || "https://lastgate.vercel.app"}/api/cli/auth`;

interface CliConfig {
  token?: string;
  apiUrl?: string;
}

async function loadCliConfig(): Promise<CliConfig> {
  try {
    const content = await Bun.file(CONFIG_PATH).text();
    return JSON.parse(content) as CliConfig;
  } catch {
    return {};
  }
}

async function saveCliConfig(config: CliConfig): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }

  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2));
}

interface LoginOptions {
  token?: string;
}

async function runLogin(options: LoginOptions): Promise<void> {
  if (options.token) {
    // Direct token mode
    const config = await loadCliConfig();
    config.token = options.token;
    await saveCliConfig(config);

    console.log("");
    console.log(success("✓") + bold(" API token saved!"));
    console.log(dim(`  Stored at ${CONFIG_PATH}`));
    console.log("");
    return;
  }

  // Browser-based auth flow
  console.log("");
  console.log(bold("LastGate Login"));
  console.log("");
  console.log("  Open this URL in your browser to authenticate:");
  console.log("");
  console.log(info(`  ${DASHBOARD_LOGIN_URL}`));
  console.log("");

  // Try to open browser
  try {
    const opener =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";

    Bun.spawn([opener, DASHBOARD_LOGIN_URL], {
      stdout: "ignore",
      stderr: "ignore",
    });

    console.log(dim("  Browser opened automatically."));
  } catch {
    console.log(dim("  (Could not open browser automatically)"));
  }

  console.log("");
  console.log("  After authenticating, paste your token below:");
  console.log("");

  const token = prompt("  Token:");

  if (!token || token.trim().length === 0) {
    console.log(error("  No token provided. Login aborted."));
    process.exit(1);
  }

  const config = await loadCliConfig();
  config.token = token.trim();
  await saveCliConfig(config);

  console.log("");
  console.log(success("✓") + bold(" Logged in successfully!"));
  console.log(dim(`  Token stored at ${CONFIG_PATH}`));
  console.log("");
}

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Authenticate with the LastGate dashboard")
    .option("--token <token>", "Set API token directly without browser flow")
    .action(runLogin);
}

export { loadCliConfig, CONFIG_PATH };
