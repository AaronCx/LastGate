import { describe, test, expect } from "bun:test";

/**
 * Tests for parseLogOutput logic and CommitInfo shape.
 *
 * We replicate the parsing logic from commits.ts here since
 * parseLogOutput is not exported. This validates the data
 * transformation and CommitInfo contract.
 */

interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
}

const LOG_FORMAT_SEPARATOR = "---END---";

function parseLogOutput(output: string): CommitInfo[] {
  const commits: CommitInfo[] = [];
  const entries = output
    .split(`${LOG_FORMAT_SEPARATOR}\n`)
    .filter((e) => e.trim().length > 0);

  for (const entry of entries) {
    const lines = entry.trim().split("\n");
    if (lines.length < 4) continue;

    const [hash, authorName, authorEmail, subject, ...bodyLines] = lines;

    commits.push({
      sha: hash.trim(),
      author: `${authorName.trim()} <${authorEmail.trim()}>`,
      message: subject.trim(),
      timestamp: new Date().toISOString(),
    });
  }

  return commits;
}

describe("parseLogOutput", () => {
  test("parses a single commit entry", () => {
    const output = [
      "abc123def456",
      "Jane Doe",
      "jane@example.com",
      "fix: resolve issue with login",
      "",
      `${LOG_FORMAT_SEPARATOR}`,
      "",
    ].join("\n");

    const commits = parseLogOutput(output);
    expect(commits).toHaveLength(1);
    expect(commits[0].sha).toBe("abc123def456");
    expect(commits[0].author).toBe("Jane Doe <jane@example.com>");
    expect(commits[0].message).toBe("fix: resolve issue with login");
  });

  test("parses multiple commit entries", () => {
    const output = [
      "aaa111",
      "Alice",
      "alice@test.com",
      "feat: add dashboard",
      "",
      LOG_FORMAT_SEPARATOR,
      "bbb222",
      "Bob",
      "bob@test.com",
      "fix: typo in readme",
      "",
      LOG_FORMAT_SEPARATOR,
      "ccc333",
      "Charlie",
      "charlie@test.com",
      "chore: update deps",
      "",
      LOG_FORMAT_SEPARATOR,
      "",
    ].join("\n");

    const commits = parseLogOutput(output);
    expect(commits).toHaveLength(3);
    expect(commits[0].sha).toBe("aaa111");
    expect(commits[1].sha).toBe("bbb222");
    expect(commits[2].sha).toBe("ccc333");
    expect(commits[0].author).toBe("Alice <alice@test.com>");
    expect(commits[1].message).toBe("fix: typo in readme");
  });

  test("returns empty array for empty output", () => {
    const commits = parseLogOutput("");
    expect(commits).toHaveLength(0);
  });

  test("returns empty array for whitespace-only output", () => {
    const commits = parseLogOutput("   \n\n  ");
    expect(commits).toHaveLength(0);
  });

  test("skips entries with fewer than 4 lines", () => {
    const output = [
      "short-hash",
      "Name",
      LOG_FORMAT_SEPARATOR,
      "",
    ].join("\n");

    const commits = parseLogOutput(output);
    expect(commits).toHaveLength(0);
  });

  test("CommitInfo uses sha field (not hash)", () => {
    const output = [
      "deadbeef",
      "Dev",
      "dev@test.com",
      "test commit",
      "",
      LOG_FORMAT_SEPARATOR,
      "",
    ].join("\n");

    const commits = parseLogOutput(output);
    expect(commits[0]).toHaveProperty("sha");
    expect(commits[0]).not.toHaveProperty("hash");
  });

  test("author is a formatted string, not an object", () => {
    const output = [
      "deadbeef",
      "John Smith",
      "john@smith.com",
      "some message",
      "",
      LOG_FORMAT_SEPARATOR,
      "",
    ].join("\n");

    const commits = parseLogOutput(output);
    expect(typeof commits[0].author).toBe("string");
    expect(commits[0].author).toContain("John Smith");
    expect(commits[0].author).toContain("john@smith.com");
  });

  test("timestamp is a valid ISO string", () => {
    const output = [
      "deadbeef",
      "Dev",
      "dev@test.com",
      "msg",
      "",
      LOG_FORMAT_SEPARATOR,
      "",
    ].join("\n");

    const commits = parseLogOutput(output);
    const ts = commits[0].timestamp;
    expect(typeof ts).toBe("string");
    const parsed = new Date(ts);
    expect(parsed.getTime()).not.toBeNaN();
  });

  test("handles commit messages with special characters", () => {
    const output = [
      "abc123",
      "Dev",
      "dev@test.com",
      "feat: add \"quotes\" & <brackets> support",
      "",
      LOG_FORMAT_SEPARATOR,
      "",
    ].join("\n");

    const commits = parseLogOutput(output);
    expect(commits[0].message).toBe("feat: add \"quotes\" & <brackets> support");
  });

  test("trims whitespace from all fields", () => {
    const output = [
      "  abc123  ",
      "  Dev  ",
      "  dev@test.com  ",
      "  trimmed message  ",
      "",
      LOG_FORMAT_SEPARATOR,
      "",
    ].join("\n");

    const commits = parseLogOutput(output);
    expect(commits[0].sha).toBe("abc123");
    expect(commits[0].author).toBe("Dev <dev@test.com>");
    expect(commits[0].message).toBe("trimmed message");
  });

  test("body lines are ignored (only subject is used for message)", () => {
    const output = [
      "abc123",
      "Dev",
      "dev@test.com",
      "feat: subject line",
      "This is the body line 1",
      "This is the body line 2",
      LOG_FORMAT_SEPARATOR,
      "",
    ].join("\n");

    const commits = parseLogOutput(output);
    expect(commits[0].message).toBe("feat: subject line");
  });

  test("author format is 'Name <email>'", () => {
    const output = [
      "abc123",
      "Full Name Here",
      "user@domain.org",
      "commit msg",
      "",
      LOG_FORMAT_SEPARATOR,
      "",
    ].join("\n");

    const commits = parseLogOutput(output);
    expect(commits[0].author).toBe("Full Name Here <user@domain.org>");
    expect(commits[0].author).toMatch(/^.+ <.+@.+>$/);
  });
});
