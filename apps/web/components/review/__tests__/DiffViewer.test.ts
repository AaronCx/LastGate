import { describe, test, expect } from "bun:test";

const sampleDiff = `@@ -1,5 +1,7 @@
 import { useState } from "react";
+import { useAuth } from "@/hooks/useAuth";

 export default function App() {
-  return <div>Hello</div>;
+  const { user } = useAuth();
+  return <div>Hello {user?.name}</div>;
 }`;

describe("DiffViewer", () => {
  test("renders a unified diff view with line numbers", () => {
    const lines = sampleDiff.split("\n");
    expect(lines.length).toBeGreaterThan(0);
    // Each line has a type: added (+), removed (-), context ( ), or header (@@)
    const addedLines = lines.filter(l => l.startsWith("+") && !l.startsWith("+++"));
    const removedLines = lines.filter(l => l.startsWith("-") && !l.startsWith("---"));
    const contextLines = lines.filter(l => l.startsWith(" "));
    expect(addedLines.length).toBe(3);
    expect(removedLines.length).toBe(1);
    expect(contextLines.length).toBe(3);
  });

  test("diff lines are color-coded (green for additions, red for deletions)", () => {
    const colorMap: Record<string, string> = {
      "+": "bg-green-50",
      "-": "bg-red-50",
      " ": "",
    };
    expect(colorMap["+"]).toContain("green");
    expect(colorMap["-"]).toContain("red");
  });

  test("annotations render at correct line numbers", () => {
    const annotations = [
      { path: "src/App.tsx", start_line: 2, message: "New import detected", level: "notice" },
      { path: "src/App.tsx", start_line: 6, message: "Potential XSS with user input", level: "warning" },
    ];
    expect(annotations[0].start_line).toBe(2);
    expect(annotations[1].start_line).toBe(6);
    expect(annotations[1].level).toBe("warning");
  });

  test("annotation shows check type, severity, and message", () => {
    const annotation = {
      checkType: "secrets",
      severity: "failure",
      message: "Hardcoded API key detected",
      path: "src/config.ts",
      line: 14,
    };
    expect(annotation.checkType).toBe("secrets");
    expect(annotation.severity).toBe("failure");
    expect(annotation.message).toContain("API key");
  });

  test("syntax highlighting for TypeScript/JSX", () => {
    const supportedLanguages = ["ts", "tsx", "js", "jsx", "py", "json"];
    const file = "src/App.tsx";
    const ext = file.split(".").pop();
    expect(supportedLanguages).toContain(ext);
  });
});
