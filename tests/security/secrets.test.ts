import { describe, test, expect } from "bun:test";
import { checkSecrets } from "../../packages/engine/src/checks/secrets";
import type { SecretCheckConfig } from "../../packages/engine/src/types";

const config: SecretCheckConfig = { enabled: true, severity: "fail" };

describe("Secret Handling", () => {
  test("findings redact the actual secret value (never stored full)", async () => {
    const result = await checkSecrets(
      [{ path: "src/config.ts", content: 'const key = "AKIAIOSFODNN7EXAMPLE";', status: "added" }],
      config,
    );
    const findings = result.details.findings as any[];
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      // Match should be redacted with ***
      expect(finding.match).toContain("***");
      // Should NOT contain the full original value
      expect(finding.match).not.toBe("AKIAIOSFODNN7EXAMPLE");
    }
  });

  test("database entries would not contain raw secret values", async () => {
    const result = await checkSecrets(
      [{ path: "src/api.ts", content: 'token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl"', status: "added" }],
      config,
    );
    const findings = result.details.findings as any[];
    for (const finding of findings) {
      // Stored match is redacted
      expect(finding.match).toContain("***");
      expect(finding.match.length).toBeLessThan(50); // Much shorter than original
    }
  });

  test("API response shows redacted secrets only", async () => {
    const result = await checkSecrets(
      [{ path: "src/billing.ts", content: `const stripe = "${"sk_" + "live_"}ABCDEFGHIJKLMNOPQRSTUVWXYZab";`, status: "added" }],
      config,
    );
    const findings = result.details.findings as any[];
    for (const finding of findings) {
      expect(finding.match).toContain("***");
    }
    // Serialize to JSON and verify no raw key leaks
    const json = JSON.stringify(result);
    expect(json).not.toContain(`${"sk_" + "live_"}ABCDEFGHIJKLMNOPQRSTUVWXYZab`);
  });

  test("redaction preserves enough for identification", async () => {
    const result = await checkSecrets(
      [{ path: "src/config.ts", content: 'password = "my_super_secret_password_123"', status: "added" }],
      config,
    );
    const findings = result.details.findings as any[];
    for (const finding of findings) {
      // Should show first few and last few chars
      expect(finding.match.length).toBeGreaterThan(5);
      expect(finding.match).toContain("***");
    }
  });

  test("log output does not contain raw secret values", async () => {
    const result = await checkSecrets(
      [{ path: "src/db.ts", content: 'const url = "postgres://admin:secretpass123@db.host:5432/prod";', status: "added" }],
      config,
    );
    // The summary should not contain the raw connection string
    expect(result.summary).not.toContain("secretpass123");
    // The details findings should have redacted matches
    const findings = result.details.findings as any[];
    for (const finding of findings) {
      expect(finding.match).toContain("***");
    }
  });
});
