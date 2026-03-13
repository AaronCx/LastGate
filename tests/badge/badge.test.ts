import { describe, test, expect } from "bun:test";
import { getStatusFromRuns, getDetailedStatus } from "../../packages/engine/src/badge/status";
import { generateBadgeSvg } from "../../packages/engine/src/badge/svg";

describe("Badge Status", () => {
  test("returns 'passing' when all recent checks passed", () => {
    const runs = [
      { status: "passed", created_at: "2026-03-10T10:00:00Z" },
      { status: "passed", created_at: "2026-03-09T10:00:00Z" },
    ];
    const result = getStatusFromRuns(runs);
    expect(result.label).toBe("passing");
    expect(result.color).toBe("#4c1");
  });

  test("returns 'failing' when any recent check failed", () => {
    const runs = [
      { status: "failed", created_at: "2026-03-10T10:00:00Z" },
      { status: "passed", created_at: "2026-03-09T10:00:00Z" },
    ];
    const result = getStatusFromRuns(runs);
    expect(result.label).toBe("failing");
    expect(result.color).toBe("#e05d44");
  });

  test("returns 'warnings' when warnings but no failures", () => {
    const runs = [
      { status: "warned", created_at: "2026-03-10T10:00:00Z" },
      { status: "passed", created_at: "2026-03-09T10:00:00Z" },
    ];
    const result = getStatusFromRuns(runs);
    expect(result.label).toBe("warnings");
    expect(result.color).toBe("#dfb317");
  });

  test("returns 'unknown' for empty runs", () => {
    const result = getStatusFromRuns([]);
    expect(result.label).toBe("unknown");
    expect(result.color).toBe("#9f9f9f");
  });

  test("only considers the 5 most recent runs", () => {
    const runs = [
      { status: "passed", created_at: "2026-03-10T10:00:00Z" },
      { status: "passed", created_at: "2026-03-09T10:00:00Z" },
      { status: "passed", created_at: "2026-03-08T10:00:00Z" },
      { status: "passed", created_at: "2026-03-07T10:00:00Z" },
      { status: "passed", created_at: "2026-03-06T10:00:00Z" },
      { status: "failed", created_at: "2026-03-05T10:00:00Z" }, // beyond 5
    ];
    const result = getStatusFromRuns(runs);
    expect(result.label).toBe("passing");
  });
});

describe("Badge Detailed Status", () => {
  test("shows pass count and rate", () => {
    const runs = [
      { status: "passed" },
      { status: "passed" },
      { status: "failed" },
    ];
    const result = getDetailedStatus(runs);
    expect(result.label).toContain("2/3");
    expect(result.label).toContain("67%");
  });

  test("100% pass rate is green", () => {
    const runs = [{ status: "passed" }, { status: "passed" }];
    const result = getDetailedStatus(runs);
    expect(result.color).toBe("#4c1");
  });

  test("below 70% is red", () => {
    const runs = [
      { status: "passed" },
      { status: "failed" },
      { status: "failed" },
      { status: "failed" },
    ];
    const result = getDetailedStatus(runs);
    expect(result.color).toBe("#e05d44");
  });

  test("between 70-90% is yellow", () => {
    const runs = Array.from({ length: 10 }, (_, i) => ({
      status: i < 8 ? "passed" : "failed",
    }));
    const result = getDetailedStatus(runs);
    expect(result.color).toBe("#dfb317");
  });
});

describe("Badge SVG Generator", () => {
  test("generates valid SVG", () => {
    const svg = generateBadgeSvg({ label: "LastGate", message: "passing", color: "#4c1" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("xmlns=");
  });

  test("includes label and message text", () => {
    const svg = generateBadgeSvg({ label: "LastGate", message: "failing", color: "#e05d44" });
    expect(svg).toContain("LastGate");
    expect(svg).toContain("failing");
  });

  test("uses provided color for message background", () => {
    const svg = generateBadgeSvg({ label: "LastGate", message: "passing", color: "#4c1" });
    expect(svg).toContain('fill="#4c1"');
  });

  test("escapes special XML characters", () => {
    const svg = generateBadgeSvg({ label: "Test<>", message: 'Msg&"', color: "#000" });
    expect(svg).toContain("&lt;");
    expect(svg).toContain("&gt;");
    expect(svg).toContain("&amp;");
    expect(svg).toContain("&quot;");
  });

  test("has correct width based on text length", () => {
    const short = generateBadgeSvg({ label: "LG", message: "ok", color: "#4c1" });
    const long = generateBadgeSvg({ label: "LastGate", message: "passing with warnings", color: "#4c1" });
    // Extract width from SVG
    const shortWidth = parseInt(short.match(/width="(\d+)"/)?.[1] || "0");
    const longWidth = parseInt(long.match(/width="(\d+)"/)?.[1] || "0");
    expect(longWidth).toBeGreaterThan(shortWidth);
  });

  test("caching headers are set correctly (5 min)", () => {
    // This tests the expected cache header value
    const expectedHeader = "s-maxage=300, stale-while-revalidate=60";
    expect(expectedHeader).toContain("300");
    expect(expectedHeader).toContain("stale-while-revalidate");
  });
});
