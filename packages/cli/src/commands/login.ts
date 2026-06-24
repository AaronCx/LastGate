import { Command } from "commander";
import { mkdirSync, chmodSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { success, error, dim, bold, info } from "../output/colors";

const CONFIG_DIR = resolve(homedir(), ".lastgate");
const CONFIG_PATH = resolve(CONFIG_DIR, "config.json");
const API_BASE = process.env.LASTGATE_API_URL || "https://lastgate.vercel.app";

interface CliConfig {
  token?: string;
  apiUrl?: string;
}

async function loadCliConfig(): Promise<CliConfig> {
  try {
    const content = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(content) as CliConfig;
  } catch {
    return {};
  }
}

async function saveCliConfig(config: CliConfig): Promise<void> {
  // (Re)assert the private dir mode every time, not just on first create.
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  try {
    chmodSync(CONFIG_DIR, 0o700);
  } catch {
    /* best-effort */
  }
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
  // The token is a live credential — keep it owner-only (was world-readable 0644).
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    /* best-effort */
  }
}

function openBrowser(url: string): void {
  try {
    const opener =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";
    const child = spawn(opener, [url], { stdio: "ignore", detached: true });
    child.unref();
  } catch {
    /* non-fatal — the user can open the URL manually */
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

interface LoginOptions {
  token?: string;
}

async function runLogin(options: LoginOptions): Promise<void> {
  if (options.token) {
    const config = await loadCliConfig();
    config.token = options.token;
    await saveCliConfig(config);
    console.log("");
    console.log(success("✓") + bold(" API token saved!"));
    console.log(dim(`  Stored at ${CONFIG_PATH}`));
    console.log("");
    return;
  }

  // Device flow: start it, show the user a code + URL, poll until approved.
  console.log("");
  console.log(bold("LastGate Login"));

  let start: {
    device_code: string;
    user_code: string;
    verification_uri: string;
    interval?: number;
    expires_in?: number;
  };
  try {
    const res = await fetch(`${API_BASE}/api/cli/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "device_start" }),
    });
    if (!res.ok) throw new Error(`device start failed (${res.status})`);
    start = await res.json();
  } catch (err) {
    console.log(
      error(`  Could not start login: ${err instanceof Error ? err.message : String(err)}`),
    );
    process.exit(1);
  }

  const { device_code, user_code, verification_uri, interval = 5, expires_in = 600 } = start;
  console.log("");
  console.log("  Open this URL and enter the code to authorize this CLI:");
  console.log("");
  console.log(info(`  ${verification_uri}`));
  console.log("  Code: " + bold(user_code));
  console.log("");
  openBrowser(verification_uri);

  const deadline = Date.now() + expires_in * 1000;
  process.stdout.write(dim("  Waiting for authorization"));
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    process.stdout.write(dim("."));
    try {
      const res = await fetch(`${API_BASE}/api/cli/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code }),
      });
      if (res.ok) {
        const { api_key } = (await res.json()) as { api_key: string };
        const config = await loadCliConfig();
        config.token = api_key;
        await saveCliConfig(config);
        console.log("\n");
        console.log(success("✓") + bold(" Logged in successfully!"));
        console.log(dim(`  Token stored at ${CONFIG_PATH}`));
        console.log("");
        return;
      }
      // 404 → still pending; keep polling.
    } catch {
      /* transient network error — keep polling */
    }
  }

  console.log("");
  console.log(error("  Login timed out. Run `lastgate login` again."));
  console.log("");
  process.exit(1);
}

export function registerLoginCommand(program: Command): void {
  program
    .command("login")
    .description("Authenticate with the LastGate dashboard")
    .option("--token <token>", "Set the API token directly, skipping the device flow")
    .action(runLogin);
}

export { loadCliConfig, CONFIG_PATH };
