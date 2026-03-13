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
  add: "bg-emerald-50 text-emerald-900",
  remove: "bg-red-50 text-red-900",
  context: "bg-white text-gray-700",
};

const linePrefix = {
  add: "+",
  remove: "-",
  context: " ",
};

export default function DiffViewer({ filename, lines }: DiffViewerProps) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
        <code className="text-xs font-mono text-gray-700">{filename}</code>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className={lineColors[line.type]}>
                <td className="w-12 text-right px-2 py-0.5 text-gray-400 select-none border-r border-gray-200">
                  {line.lineNumber}
                </td>
                <td className="w-4 text-center py-0.5 select-none text-gray-400">
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
