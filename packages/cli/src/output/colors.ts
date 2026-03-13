import chalk from "chalk";

export const PASS = "\u2713";
export const FAIL = "\u2717";
export const WARN = "\u26A0";

export function success(text: string): string {
  return chalk.green(text);
}

export function error(text: string): string {
  return chalk.red(text);
}

export function warning(text: string): string {
  return chalk.yellow(text);
}

export function info(text: string): string {
  return chalk.blue(text);
}

export function dim(text: string): string {
  return chalk.dim(text);
}

export function bold(text: string): string {
  return chalk.bold(text);
}
