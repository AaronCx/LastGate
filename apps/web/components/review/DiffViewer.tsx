"use client";

interface DiffLine {
  type: "add" | "remove" | "context";
  lineNumber: number;
  content: string;
}

interface DiffViewerProps {
  filename: string;
  lines: DiffLine[];
}

const lineColors = {
  add: "bg-emerald-500/10 text-emerald-300",
  remove: "bg-red-500/10 text-red-300",
  context: "bg-lg-surface text-lg-text-secondary",
};

const linePrefix = {
  add: "+",
  remove: "-",
  context: " ",
};

export default function DiffViewer({ filename, lines }: DiffViewerProps) {
  return (
    <div className="rounded-lg border border-lg-border overflow-hidden">
      <div className="bg-lg-surface-2 border-b border-lg-border px-4 py-2">
        <code className="text-xs font-mono text-lg-text-secondary">{filename}</code>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className={lineColors[line.type]}>
                <td className="w-12 text-right px-2 py-0.5 text-lg-text-muted select-none border-r border-lg-border">
                  {line.lineNumber}
                </td>
                <td className="w-4 text-center py-0.5 select-none text-lg-text-muted">
                  {linePrefix[line.type]}
                </td>
                <td className="px-2 py-0.5 whitespace-pre">{line.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
