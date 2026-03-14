import { describe, test, expect } from "bun:test";
import { generateBadgeSvg } from "../svg";

describe("Badge SVG Generator", () => {
  test("generates valid SVG for passing status (green)", () => {
    const svg = generateBadgeSvg({ label: "LastGate", message: "passing", color: "#4c1" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("#4c1");
    expect(svg).toContain("passing");
  });

  test("generates valid SVG for failing status (red)", () => {
    const svg = generateBadgeSvg({ label: "LastGate", message: "failing", color: "#e05d44" });
    expect(svg).toContain("#e05d44");
    expect(svg).toContain("failing");
  });

  test("generates valid SVG for warnings status (yellow)", () => {
    const svg = generateBadgeSvg({ label: "LastGate", message: "warnings", color: "#dfb317" });
    expect(svg).toContain("#dfb317");
    expect(svg).toContain("warnings");
  });

  test("generates valid SVG for unknown status (gray)", () => {
    const svg = generateBadgeSvg({ label: "LastGate", message: "unknown", color: "#9f9f9f" });
    expect(svg).toContain("#9f9f9f");
    expect(svg).toContain("unknown");
  });

  test("SVG includes LastGate label on left side", () => {
    const svg = generateBadgeSvg({ label: "LastGate", message: "passing", color: "#4c1" });
    expect(svg).toContain("LastGate");
  });

  test("SVG has correct dimensions (width > 0, height = 20)", () => {
    const svg = generateBadgeSvg({ label: "LastGate", message: "passing", color: "#4c1" });
    expect(svg).toContain('height="20"');
    const widthMatch = svg.match(/width="(\d+(\.\d+)?)"/);
    expect(widthMatch).not.toBeNull();
    expect(Number(widthMatch![1])).toBeGreaterThan(0);
  });

  test("SVG escapes XML special characters", () => {
    const svg = generateBadgeSvg({ label: "Last<Gate", message: "a&b", color: "#4c1" });
    expect(svg).toContain("Last&lt;Gate");
    expect(svg).toContain("a&amp;b");
    expect(svg).not.toContain("Last<Gate");
  });

  test("badge width adjusts to fit content", () => {
    const shortSvg = generateBadgeSvg({ label: "LG", message: "ok", color: "#4c1" });
    const longSvg = generateBadgeSvg({ label: "LastGate", message: "47/50 passed | 94%", color: "#4c1" });
    const shortWidth = Number(shortSvg.match(/width="(\d+(\.\d+)?)"/)?.[1]);
    const longWidth = Number(longSvg.match(/width="(\d+(\.\d+)?)"/)?.[1]);
    expect(longWidth).toBeGreaterThan(shortWidth);
  });
});
