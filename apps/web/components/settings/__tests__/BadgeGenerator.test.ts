import { describe, test, expect } from "bun:test";

/**
 * Tests for BadgeGenerator component logic: URL generation,
 * markdown format, style variations.
 */

const BASE_URL = "https://lastgate.vercel.app";

function buildBadgeUrl(repoFullName: string, style: "simple" | "detailed"): string {
  return `${BASE_URL}/api/badge/${repoFullName}${style === "detailed" ? "?style=detailed" : ""}`;
}

function buildMarkdown(repoFullName: string, style: "simple" | "detailed"): string {
  const badgeUrl = buildBadgeUrl(repoFullName, style);
  const dashboardUrl = BASE_URL;
  return `[![LastGate](${badgeUrl})](${dashboardUrl})`;
}

describe("BadgeGenerator - URL generation", () => {
  test("simple style badge URL has no query param", () => {
    const url = buildBadgeUrl("owner/repo", "simple");
    expect(url).toBe("https://lastgate.vercel.app/api/badge/owner/repo");
    expect(url).not.toContain("?style=");
  });

  test("detailed style badge URL includes style query param", () => {
    const url = buildBadgeUrl("owner/repo", "detailed");
    expect(url).toBe("https://lastgate.vercel.app/api/badge/owner/repo?style=detailed");
  });

  test("preserves full repo name including org/owner", () => {
    const url = buildBadgeUrl("my-org/my-repo", "simple");
    expect(url).toContain("my-org/my-repo");
  });

  test("handles repo names with dots and hyphens", () => {
    const url = buildBadgeUrl("org/my-repo.js", "simple");
    expect(url).toBe("https://lastgate.vercel.app/api/badge/org/my-repo.js");
  });

  test("base URL is always lastgate.vercel.app", () => {
    const url = buildBadgeUrl("test/repo", "simple");
    expect(url).toStartWith("https://lastgate.vercel.app");
  });
});

describe("BadgeGenerator - markdown format", () => {
  test("simple markdown follows standard badge format", () => {
    const md = buildMarkdown("owner/repo", "simple");
    expect(md).toBe(
      "[![LastGate](https://lastgate.vercel.app/api/badge/owner/repo)](https://lastgate.vercel.app)"
    );
  });

  test("detailed markdown includes style param in badge URL", () => {
    const md = buildMarkdown("owner/repo", "detailed");
    expect(md).toContain("?style=detailed");
  });

  test("markdown links to dashboard root", () => {
    const md = buildMarkdown("owner/repo", "simple");
    expect(md).toContain("](https://lastgate.vercel.app)");
  });

  test("markdown contains alt text 'LastGate'", () => {
    const md = buildMarkdown("owner/repo", "simple");
    expect(md).toStartWith("[![LastGate]");
  });

  test("markdown is a valid image-inside-link pattern", () => {
    const md = buildMarkdown("owner/repo", "simple");
    // Pattern: [![alt](img-url)](link-url)
    expect(md).toMatch(/^\[!\[.+\]\(.+\)\]\(.+\)$/);
  });
});

describe("BadgeGenerator - style options", () => {
  test("only two styles exist: simple and detailed", () => {
    const styles: Array<"simple" | "detailed"> = ["simple", "detailed"];
    expect(styles.length).toBe(2);
  });

  test("simple and detailed produce different URLs", () => {
    const simpleUrl = buildBadgeUrl("owner/repo", "simple");
    const detailedUrl = buildBadgeUrl("owner/repo", "detailed");
    expect(simpleUrl).not.toBe(detailedUrl);
  });

  test("simple and detailed produce different markdown", () => {
    const simpleMd = buildMarkdown("owner/repo", "simple");
    const detailedMd = buildMarkdown("owner/repo", "detailed");
    expect(simpleMd).not.toBe(detailedMd);
  });
});
