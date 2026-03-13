import { describe, test, expect } from "bun:test";
import { checkSecrets } from "../secrets";
import type { ChangedFile, SecretCheckConfig } from "../../types";

const defaultConfig: SecretCheckConfig = {
  enabled: true,
  severity: "fail",
};

function file(path: string, content: string, status: "added" | "modified" = "added"): ChangedFile {
  return { path, content, status };
}

describe("Secret Scanner", () => {
  // === Should FAIL ===

  test("detects AWS access key", async () => {
    const files = [file("src/config.ts", 'const key = "AKIAIOSFODNN7EXAMPLE";')];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).length).toBeGreaterThan(0);
    expect((result.details.findings as any[]).some((f: any) => f.pattern.includes("AWS"))).toBe(true);
  });

  test("detects GitHub PAT", async () => {
    const files = [file("src/auth.ts", 'const token = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";')];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.pattern.includes("GitHub"))).toBe(true);
  });

  test("detects OpenAI project key", async () => {
    const files = [file("src/ai.ts", 'const key = "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop";')];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.pattern.includes("OpenAI"))).toBe(true);
  });

  test("detects Anthropic key", async () => {
    const files = [file("src/ai.ts", 'const key = "sk-ant-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop";')];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.pattern.includes("Anthropic"))).toBe(true);
  });

  test("detects Stripe live key", async () => {
    const prefix = "sk_" + "live_";
    const files = [file("src/billing.ts", `const key = "${prefix}ABCDEFGHIJKLMNOPQRSTUVWXYZab";`)];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.pattern.includes("Stripe"))).toBe(true);
  });

  test("detects private key header", async () => {
    const files = [file("certs/key.pem", "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQ...")];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.pattern.includes("Private Key"))).toBe(true);
  });

  test("detects PostgreSQL connection string", async () => {
    const files = [file("src/db.ts", 'const url = "postgres://user:password@host:5432/db";')];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.pattern.includes("PostgreSQL"))).toBe(true);
  });

  test("detects generic password assignment", async () => {
    const files = [file("src/config.ts", 'password = "my_super_secret_123!"')];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.pattern.includes("Password"))).toBe(true);
  });

  test("detects Supabase JWT", async () => {
    const files = [file("src/config.ts", 'SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE5MzE4MTUwMjJ9.abcdefghijklmnopqrstuvwxyz123456')];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
  });

  test("detects high entropy string (20+ chars)", async () => {
    const files = [file("src/config.ts", 'const val = "aK3$mP9xL2qR7wN4vB8jcF5tY6u";')];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.pattern === "High Entropy String")).toBe(true);
  });

  // === Should PASS ===

  test("passes normal TypeScript code with no secrets", async () => {
    const files = [file("src/utils.ts", `
export function add(a: number, b: number): number {
  return a + b;
}
const greeting = "Hello World";
`)];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("passes env var reference (process.env)", async () => {
    const files = [file("src/config.ts", 'const key = process.env.API_KEY;')];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("passes .env.example with placeholders", async () => {
    const files = [file(".env.example", "API_KEY=your_key_here\nDATABASE_URL=your_database_url")];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("passes short high-entropy string under 20 chars", async () => {
    const files = [file("src/config.ts", 'const id = "xK9mP2qL";')];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("skips binary files", async () => {
    const files = [file("assets/image.png", "AKIAIOSFODNN7EXAMPLE some binary content")];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("skips removed files", async () => {
    const files: ChangedFile[] = [{ path: "src/old.ts", content: 'const key = "AKIAIOSFODNN7EXAMPLE";', status: "removed" }];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("pass");
  });

  test("passes empty file", async () => {
    const files = [file("src/empty.ts", "")];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("pass");
  });

  // === Custom Patterns ===

  test("detects custom pattern from config", async () => {
    const config: SecretCheckConfig = {
      ...defaultConfig,
      custom_patterns: [{
        name: "Internal Billing Key",
        pattern: "INTERNAL_[A-Z]+_KEY=[A-Za-z0-9]{32,}",
        severity: "critical",
      }],
    };
    const files = [file("src/billing.ts", "INTERNAL_BILLING_KEY=abcdefghijklmnopqrstuvwxyz123456")];
    const result = await checkSecrets(files, config);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).some((f: any) => f.pattern === "Internal Billing Key")).toBe(true);
  });

  // === Edge Cases ===

  test("reports multiple secrets on different lines", async () => {
    const files = [file("src/config.ts", `
const aws = "AKIAIOSFODNN7EXAMPLE";
const gh = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl";
password = "my_super_secret_123!"
`)];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).length).toBeGreaterThanOrEqual(3);
  });

  test("detects multiline private key", async () => {
    const files = [file("certs/server.key", `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MhgHcTz6sE2I2yPB
-----END RSA PRIVATE KEY-----`)];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
  });

  test("handles very large file without timeout", async () => {
    const lines: string[] = [];
    for (let i = 0; i < 10000; i++) {
      lines.push(`const line${i} = "normal code line ${i}";`);
    }
    lines.push('const secret = "AKIAIOSFODNN7EXAMPLE";');
    const files = [file("src/large.ts", lines.join("\n"))];
    const result = await checkSecrets(files, defaultConfig);
    expect(result.status).toBe("fail");
    expect((result.details.findings as any[]).length).toBeGreaterThan(0);
  });
});
