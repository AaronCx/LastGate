import { Command } from "commander";
import { registerCheckCommand } from "./commands/check";
import { registerInitCommand } from "./commands/init";
import { registerLoginCommand } from "./commands/login";
import { registerHistoryCommand } from "./commands/history";

const program = new Command();

program
  .name("lastgate")
  .description("AI agent commit guardian — pre-flight checks for AI-generated code")
  .version("0.1.0");

registerCheckCommand(program);
registerInitCommand(program);
registerLoginCommand(program);
registerHistoryCommand(program);

export { program };
