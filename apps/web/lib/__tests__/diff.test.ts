import { describe, it, expect } from "bun:test";
import { buildUnifiedDiff, parseUnifiedDiff } from "../diff";

describe("buildUnifiedDiff", () => {
  it("wraps each file's patch with git headers and skips patch-less files", () => {
    const out = buildUnifiedDiff([
      { path: "src/a.ts", patch: "@@ -1,1 +1,2 @@\n line1\n+added" },
      { path: "src/b.ts" }, // no patch -> skipped
    ]);
    expect(out).toContain("diff --git a/src/a.ts b/src/a.ts");
    expect(out).toContain("+++ b/src/a.ts");
    expect(out).not.toContain("src/b.ts");
  });
});

describe("parseUnifiedDiff", () => {
  const diff = buildUnifiedDiff([
    {
      path: "src/App.tsx",
      patch: [
        "@@ -1,3 +1,4 @@",
        ' import { useState } from "react";',
        '+import { useAuth } from "@/hooks/useAuth";',
        " export default function App() {",
        "-  return <div>Hello</div>;",
        "+  return <div>Hi</div>;",
      ].join("\n"),
    },
  ]);

  it("splits into files with the right filename", () => {
    const files = parseUnifiedDiff(diff);
    expect(files.length).toBe(1);
    expect(files[0].filename).toBe("src/App.tsx");
  });

  it("classifies add/remove/context with correct line numbers", () => {
    const lines = parseUnifiedDiff(diff)[0].lines;
    const adds = lines.filter((l) => l.type === "add");
    const removes = lines.filter((l) => l.type === "remove");
    const context = lines.filter((l) => l.type === "context");
    expect(adds.length).toBe(2);
    expect(removes.length).toBe(1);
    expect(context.length).toBe(2);
    // first added line is line 2 of the new file (after the first context line)
    expect(adds[0]).toEqual({ type: "add", lineNumber: 2, content: 'import { useAuth } from "@/hooks/useAuth";' });
    expect(removes[0].content).toContain("Hello");
  });

  it("returns [] for empty input", () => {
    expect(parseUnifiedDiff("")).toEqual([]);
  });
});
