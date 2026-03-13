import { existsSync } from "fs";
import { readdir } from "fs/promises";
import { resolve, join } from "path";
import { withTimeout } from "../sandbox/timeout";
import type { CheckResult } from "../types";

interface CustomCheckConfig {
  enabled: boolean;
  directory: string;
  timeout: number;
  checks?: Record<string, { severity?: "warn" | "fail"; config?: Record<string, unknown> }>;
}

interface CustomCheckModule {
  name: string;
  description: string;
  severity: "warn" | "fail";
  run: (files: any[], context: any) => Promise<{ status: string; title: string; findings?: any[] }>;
}

interface LoadedCheck {
  module: CustomCheckModule;
  config: Record<string, unknown>;
  severity: "warn" | "fail";
}

export async function loadCustomChecks(
  repoRoot: string,
  config: CustomCheckConfig
): Promise<LoadedCheck[]> {
  const checksDir = resolve(repoRoot, config.directory || ".lastgate/checks");

  if (!existsSync(checksDir)) {
    return [];
  }

  const files = await readdir(checksDir);
  const checkFiles = files.filter(
    (f) => f.endsWith(".ts") || f.endsWith(".js")
  );

  const loaded: LoadedCheck[] = [];

  for (const file of checkFiles) {
    try {
      const filePath = join(checksDir, file);
      const mod = await import(filePath);
      const check: CustomCheckModule = mod.default || mod;

      if (!check.name || !check.run) continue;

      const checkConfig = config.checks?.[check.name] || {};
      loaded.push({
        module: check,
        config: checkConfig.config || {},
        severity: checkConfig.severity || check.severity || "warn",
      });
    } catch (err) {
      console.error(`Failed to load custom check ${file}:`, err);
    }
  }

  return loaded;
}

export async function runCustomChecks(
  checks: LoadedCheck[],
  files: any[],
  context: any,
  timeoutMs: number = 30000
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const check of checks) {
    try {
      const result = await withTimeout(
        check.module.run(files, { ...context, config: check.config }),
        timeoutMs,
        check.module.name
      );

      results.push({
        name: `custom:${check.module.name}`,
        status: result.status === "fail" ? "fail" : result.status === "warn" ? "warn" : "pass",
        title: result.title,
        summary: result.title,
        details: { findings: result.findings || [] },
        annotations: [],
        duration_ms: 0,
      } as any);
    } catch (err: any) {
      results.push({
        name: `custom:${check.module.name}`,
        status: "fail",
        title: `Custom check "${check.module.name}" errored: ${err.message}`,
        summary: err.message,
        details: { error: err.message },
        annotations: [],
        duration_ms: 0,
      } as any);
    }
  }

  return results;
}
