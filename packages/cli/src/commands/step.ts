import { Command } from "commander";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import readline from "node:readline/promises";

import {
  DEFAULT_BASELINE_PATH,
  fingerprint,
  loadBaseline,
  runChecksIterable,
  runSingleCheck,
  writeBaseline,
} from "@lastgate/engine";
import type { CheckResult, PipelineInput } from "@lastgate/engine";

import { getStagedDiff, getBranchDiff } from "../git/diff";
import { getCurrentCommitInfo } from "../git/commits";
import { dim, error, info, success, warning } from "../output/colors";

export interface StepperPrompter {
  ask(prompt: string): Promise<string>;
  close(): Promise<void>;
}

export interface StepOptions {
  branch?: string;
  profile?: "fast" | "full";
  baselinePath?: string;
  /** Test-only: skip the input loop entirely and use this script of answers. */
  scriptedAnswers?: string[];
  /** Test-only: capture printed lines instead of console.log. */
  onPrint?: (line: string) => void;
}

export type StepperChoice = "f" | "i" | "a" | "e" | "s" | "c" | "q";

export interface FailingFinding {
  file?: string;
  line?: number;
  pattern?: string;
  rule?: string;
  match?: string;
  message?: string;
}

interface StepperState {
  exitCode: number;
  results: Array<{ check: CheckResult; final: "pass" | "fail" | "warn" | "skipped" | "quit" }>;
}

function makeStdioPrompter(): StepperPrompter {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return {
    ask: (prompt: string) => rl.question(prompt),
    close: async () => rl.close(),
  };
}

function makeScriptedPrompter(answers: string[]): StepperPrompter {
  let i = 0;
  return {
    ask: async () => {
      if (i >= answers.length) throw new Error(`scriptedPrompter ran out of answers at index ${i}`);
      return answers[i++];
    },
    close: async () => {},
  };
}

function extractFindings(result: CheckResult): FailingFinding[] {
  const details = result.details as Record<string, unknown> | undefined;
  const f = (details?.findings as FailingFinding[]) ?? [];
  return f;
}

function describeFinding(f: FailingFinding): string {
  const loc = f.file ? `${f.file}${f.line ? `:${f.line}` : ""}` : "(no file)";
  const rule = f.pattern ?? f.rule ?? "";
  const msg = f.message ?? f.match ?? "";
  return `  ${dim(loc)} ${rule ? `[${rule}]` : ""} ${msg}`.trimEnd();
}

async function runPipelineInput(branch?: string): Promise<PipelineInput> {
  const files = branch ? await getBranchDiff(branch) : await getStagedDiff();
  const commit = await getCurrentCommitInfo();
  return {
    files,
    commits: [commit],
    branch: branch ?? "HEAD",
    repoFullName: "local/step",
  };
}

async function applyAutofixes(_result: CheckResult, print: (s: string) => void): Promise<boolean> {
  // PR-5: pluggable hook into the planAutoFixes pipeline lives in engine/autofix. The v1 stepper
  // wires a minimal acknowledgement so [f]ix has a defined contract; richer integration with the
  // planAutoFixes side comes later. Returning false means "nothing applied" — the prompt loop
  // then offers the user another choice (a/c/q) instead of pretending to have fixed the issue.
  print(dim("  (autofix planner has no applicable fixer for this finding yet)"));
  return false;
}

async function openInEditor(file: string, line: number | undefined, print: (s: string) => void): Promise<void> {
  const editor = process.env.EDITOR ?? "vi";
  print(info(`  opening ${file}${line ? `:${line}` : ""} in ${editor}…`));
  const args = line ? [`+${line}`, file] : [file];
  await new Promise<void>((res) => {
    const child = spawn(editor, args, { stdio: "inherit" });
    child.once("exit", () => res());
    child.once("error", () => res());
  });
}

async function appendBaseline(
  findings: FailingFinding[],
  checkType: string,
  baselinePath: string,
  print: (s: string) => void,
): Promise<number> {
  const existing = await loadBaseline(baselinePath);
  const added: string[] = [];
  for (const f of findings) {
    if (!f.file) continue;
    const fp = fingerprint({
      check: checkType,
      file: f.file,
      rule: f.pattern ?? f.rule ?? "",
      redactedMatch: f.match,
    });
    if (!existing.has(fp)) {
      existing.add(fp);
      added.push(fp);
    }
  }
  await writeBaseline(baselinePath, [...existing]);
  print(success(`  added ${added.length} fingerprint(s) to ${baselinePath}`));
  return added.length;
}

function pickChoice(input: string): StepperChoice | undefined {
  const ch = input.trim().toLowerCase().slice(0, 1);
  if (ch === "f" || ch === "i" || ch === "a" || ch === "e" || ch === "s" || ch === "c" || ch === "q") {
    return ch;
  }
  return undefined;
}

export interface StepperLoopOptions extends StepOptions {
  input: PipelineInput;
}

/**
 * Pure stepper loop — no git reads, no process.exit. Drives runChecksIterable, prompts on
 * fail/warn, returns a state object. Used directly by tests with scriptedAnswers.
 */
export async function runStepperLoop(options: StepperLoopOptions): Promise<StepperState> {
  const baselinePath = options.baselinePath ?? DEFAULT_BASELINE_PATH;
  // Plumb the baseline path through PipelineInput.config so every re-run picks it up.
  const input: PipelineInput = {
    ...options.input,
    config: {
      ...(options.input.config ?? {}),
      baseline: baselinePath,
    },
  };
  const print = options.onPrint ?? ((line: string) => console.log(line));
  const prompter = options.scriptedAnswers
    ? makeScriptedPrompter(options.scriptedAnswers)
    : makeStdioPrompter();

  const state: StepperState = { exitCode: 0, results: [] };

  try {
    for await (const initial of runChecksIterable(input, { profile: options.profile })) {
      let current = initial;

      while (true) {
        const findings = extractFindings(current);

        if (current.status === "pass") {
          print(success(`✓ ${current.title}`));
          state.results.push({ check: current, final: "pass" });
          break;
        }

        // fail or warn — both pause the stepper.
        const head = current.status === "fail" ? error(`✗ ${current.title}`) : warning(`⚠ ${current.title}`);
        print(head);
        if (current.summary) print(dim(`  ${current.summary}`));
        for (const f of findings.slice(0, 5)) print(describeFinding(f));
        if (findings.length > 5) print(dim(`  …and ${findings.length - 5} more`));

        const choiceInput = await prompter.ask(
          "  [f]ix [i]gnore once [a]llowlist [e]dit [s]kip step [c]ontinue [q]uit  > ",
        );
        const choice = pickChoice(choiceInput);

        if (choice === "q") {
          state.results.push({ check: current, final: "quit" });
          state.exitCode = 1;
          return state;
        }

        if (choice === "c") {
          state.results.push({ check: current, final: current.status });
          if (current.status === "fail") state.exitCode = 1;
          break;
        }

        if (choice === "s") {
          print(dim("  step skipped (not retried)"));
          state.results.push({ check: current, final: "skipped" });
          break;
        }

        if (choice === "i") {
          print(dim("  ignored once (not added to baseline)"));
          state.results.push({ check: current, final: current.status });
          if (current.status === "fail") state.exitCode = 1;
          break;
        }

        if (choice === "e") {
          const first = findings[0];
          if (first?.file) {
            await openInEditor(first.file, first.line, print);
            // After editor, reload input and re-run the check.
            const fresh = await runPipelineInput(options.branch);
            const re = await runSingleCheck(fresh, { profile: options.profile }, current.type);
            if (re) current = re;
            continue;
          }
          print(dim("  no file location to edit"));
          continue;
        }

        if (choice === "a") {
          await appendBaseline(findings, current.type, baselinePath, print);
          const re = await runSingleCheck(input, { profile: options.profile }, current.type);
          if (re) current = re;
          continue;
        }

        if (choice === "f") {
          const applied = await applyAutofixes(current, print);
          if (applied) {
            const re = await runSingleCheck(input, { profile: options.profile }, current.type);
            if (re) current = re;
            continue;
          }
          print(dim("  no fixer applied — pick another option."));
          continue;
        }

        print(dim("  unrecognized — please pick f/i/a/e/s/c/q"));
      }
    }
  } finally {
    await prompter.close();
  }

  return state;
}

export async function runStepper(options: StepOptions): Promise<StepperState> {
  const input = await runPipelineInput(options.branch);
  return runStepperLoop({ ...options, input });
}

async function isGitRepo(): Promise<boolean> {
  try {
    const { execSync } = await import("node:child_process");
    execSync("git rev-parse --git-dir", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function registerStepCommand(program: Command): void {
  program
    .command("step")
    .description(
      "Run checks one at a time. On a failing step, pick [f]ix, [a]llowlist (baseline), [e]dit, [s]kip, [c]ontinue, or [q]uit.",
    )
    .option("--branch <branch>", "Use the merge-base with this branch instead of --staged.")
    .option("--profile <profile>", "fast (default) skips build; full runs everything.", "fast")
    .option("--baseline <path>", `Baseline file path (default ${DEFAULT_BASELINE_PATH}).`)
    .action(async (opts: { branch?: string; profile?: string; baseline?: string }) => {
      if (!(await isGitRepo())) {
        console.error(error("\n✖ Not a git repository.\n"));
        process.exit(1);
      }
      const profile = opts.profile === "full" ? "full" : "fast";
      const state = await runStepper({
        branch: opts.branch,
        profile,
        baselinePath: opts.baseline ? resolve(opts.baseline) : undefined,
      });
      process.exit(state.exitCode);
    });
}

void fs; // exported for tests that need a baseline path probe
