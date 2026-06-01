import { Command } from "commander";
import { registerCheckCommand } from "./commands/check";
import { registerInitCommand } from "./commands/init";
import { registerLoginCommand } from "./commands/login";
import { registerHistoryCommand } from "./commands/history";
import { registerBaselineCommand } from "./commands/baseline";
import { registerStepCommand } from "./commands/step";
import { registerInstallHooksCommand } from "./commands/install-hooks";
import { registerWatchCommand } from "./commands/watch";

const program = new Command();

program
  .name("lastgate")
  .description("AI agent commit guardian — pre-flight checks for AI-generated code")
  .version("0.1.0");

registerCheckCommand(program);
registerInitCommand(program);
registerLoginCommand(program);
registerHistoryCommand(program);
registerBaselineCommand(program);
registerStepCommand(program);
registerInstallHooksCommand(program);
registerWatchCommand(program);

export { program };
