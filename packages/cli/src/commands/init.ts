import { Command } from "commander";
import { resolve } from "path";
import { existsSync } from "fs";
import { success, warning, bold, dim } from "../output/colors";

const DEFAULT_CONFIG = `# LastGate Configuration
# https://lastgate.dev/docs/config

checks:
  secrets:
    enabled: true
    severity: fail

  lint:
    enabled: true
    severity: fail

  commit-message:
    enabled: true
    severity: warn
    format: conventional

  file-size:
    enabled: true
    severity: warn
    maxSizeKb: 500

  sensitive-files:
    enabled: true
    severity: fail
    patterns:
      - ".env"
      - "*.pem"
      - "*.key"
      - "credentials.*"

# Optional: connect to LastGate Dashboard
# dashboard:
#   project: your-project-id
#   reportResults: true
`;

async function runInit(): Promise<void> {
  const configPath = resolve(process.cwd(), ".lastgate.yml");

  if (existsSync(configPath)) {
    // Use Bun's prompt for confirmation
    const answer = prompt(
      warning("⚠ .lastgate.yml already exists. Overwrite? (y/N)")
    );

    if (answer?.toLowerCase() !== "y") {
      console.log(dim("Aborted."));
      return;
    }
  }

  await Bun.write(configPath, DEFAULT_CONFIG);

  console.log("");
  console.log(success("✓") + bold(" LastGate initialized!"));
  console.log("");
  console.log(`  Config written to ${dim(configPath)}`);
  console.log("");
  console.log(dim("  Next steps:"));
  console.log(dim("  1. Edit .lastgate.yml to customize checks"));
  console.log(dim("  2. Run `lastgate check` to verify your setup"));
  console.log(dim("  3. Add to your CI pipeline or git hooks"));
  console.log("");
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Create a .lastgate.yml config file in the current directory")
    .action(runInit);
}
