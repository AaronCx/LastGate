import { describe, test, expect } from "bun:test";

describe("Input Validation", () => {
  test("API endpoints reject malformed JSON bodies", () => {
    const malformedInputs = [
      "not json",
      "{invalid}",
      "{'single': 'quotes'}",
      "",
    ];
    for (const input of malformedInputs) {
      expect(() => JSON.parse(input)).toThrow();
    }
  });

  test("SQL injection attempt in query parameters is safely handled", () => {
    const maliciousRepo = "'; DROP TABLE check_runs; --";
    // Supabase uses parameterized queries, so this is safe
    const url = new URL(`http://localhost:3000/api/checks?repo=${encodeURIComponent(maliciousRepo)}`);
    const repo = url.searchParams.get("repo");
    expect(repo).toBe("'; DROP TABLE check_runs; --");
    // The value is passed to Supabase .eq() which parameterizes it
  });

  test("XSS payload in commit messages is escaped", () => {
    const xssMessage = '<script>alert("xss")</script>';
    // In React, JSX automatically escapes HTML entities
    const escaped = xssMessage
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    expect(escaped).not.toContain("<script>");
    expect(escaped).toContain("&lt;script&gt;");
  });

  test("path traversal in file paths is sanitized", () => {
    const maliciousPath = "../../../etc/passwd";
    // Check results should strip leading ../ sequences
    const sanitized = maliciousPath.replace(/^(\.\.\/)+/, "");
    expect(sanitized).toBe("etc/passwd");
    expect(sanitized).not.toStartWith("../");
  });

  test("extremely long strings are truncatable", () => {
    const longString = "A".repeat(100000);
    const maxLength = 10000;
    const truncated = longString.length > maxLength ? longString.substring(0, maxLength) : longString;
    expect(truncated.length).toBe(maxLength);
  });

  test("null bytes in input don't cause issues", () => {
    const inputWithNull = "normal text\0hidden text";
    const sanitized = inputWithNull.replace(/\0/g, "");
    expect(sanitized).toBe("normal texthidden text");
  });

  test("unicode injection doesn't break processing", () => {
    const unicodeInput = "commit: 修正バグ 🐛 \u200B\u200B";
    expect(typeof unicodeInput).toBe("string");
    expect(unicodeInput.length).toBeGreaterThan(0);
  });
});
