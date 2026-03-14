import { describe, test, expect } from "bun:test";
import { runCustomChecks } from "../custom";

describe("Plugin Loader & Execution", () => {
  test("runCustomChecks returns empty array for empty checks", async () => {
    const results = await runCustomChecks([], [], {});
    expect(results).toEqual([]);
  });

  test("runCustomChecks processes a valid custom check module", async () => {
    const checks = [
      {
        module: {
          name: "test-check",
          description: "A test check",
          severity: "warn" as const,
          run: async () => ({ status: "pass", title: "All good" }),
        },
        config: {},
        severity: "warn" as const,
      },
    ];
    const results = await runCustomChecks(checks, [], {});
    expect(results.length).toBe(1);
    expect((results[0] as any).name).toBe("custom:test-check");
  });

  test("failing custom check returns fail status", async () => {
    const checks = [
      {
        module: {
          name: "fail-check",
          description: "Always fails",
          severity: "fail" as const,
          run: async () => ({
            status: "fail",
            title: "Check failed",
            findings: [{ file: "src/index.ts", line: 1, message: "Bad code" }],
          }),
        },
        config: {},
        severity: "fail" as const,
      },
    ];
    const results = await runCustomChecks(checks, [], {});
    expect(results.length).toBe(1);
    expect((results[0] as any).status).toBe("fail");
  });

  test("check that throws is caught and marked as errored", async () => {
    const checks = [
      {
        module: {
          name: "throw-check",
          description: "Throws an error",
          severity: "fail" as const,
          run: async () => {
            throw new Error("Boom!");
          },
        },
        config: {},
        severity: "fail" as const,
      },
    ];
    const results = await runCustomChecks(checks, [], {});
    expect(results.length).toBe(1);
    expect((results[0] as any).status).toBe("fail");
    expect((results[0] as any).title).toContain("Boom!");
  });

  test("check that throws a non-Error is caught", async () => {
    const checks = [
      {
        module: {
          name: "non-error-throw",
          description: "Throws a string",
          severity: "fail" as const,
          run: async () => {
            throw "string error";
          },
        },
        config: {},
        severity: "fail" as const,
      },
    ];
    const results = await runCustomChecks(checks, [], {});
    expect(results.length).toBe(1);
    expect((results[0] as any).status).toBe("fail");
  });

  test("multiple custom checks run and return results", async () => {
    const checks = [
      {
        module: {
          name: "check-a",
          description: "Check A",
          severity: "warn" as const,
          run: async () => ({ status: "pass", title: "A passed" }),
        },
        config: {},
        severity: "warn" as const,
      },
      {
        module: {
          name: "check-b",
          description: "Check B",
          severity: "fail" as const,
          run: async () => ({ status: "fail", title: "B failed" }),
        },
        config: {},
        severity: "fail" as const,
      },
    ];
    const results = await runCustomChecks(checks, [], {});
    expect(results.length).toBe(2);
  });

  test("check result includes findings in details", async () => {
    const checks = [
      {
        module: {
          name: "findings-check",
          description: "Returns findings",
          severity: "warn" as const,
          run: async () => ({
            status: "warn",
            title: "Found issues",
            findings: [
              { file: "src/a.ts", line: 5, message: "Issue A" },
              { file: "src/b.ts", line: 10, message: "Issue B" },
            ],
          }),
        },
        config: {},
        severity: "warn" as const,
      },
    ];
    const results = await runCustomChecks(checks, [], {});
    expect((results[0] as any).details.findings.length).toBe(2);
  });

  test("config is passed to check context", async () => {
    let receivedConfig: any;
    const checks = [
      {
        module: {
          name: "config-check",
          description: "Check config access",
          severity: "warn" as const,
          run: async (_files: any[], context: any) => {
            receivedConfig = context.config;
            return { status: "pass", title: "OK" };
          },
        },
        config: { max_lines: 500 },
        severity: "warn" as const,
      },
    ];
    await runCustomChecks(checks, [], {});
    expect(receivedConfig).toEqual({ max_lines: 500 });
  });
});
