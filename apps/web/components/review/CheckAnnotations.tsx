"use client";

import { AlertTriangle, XCircle, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Annotation {
  file: string;
  line: number;
  severity: "error" | "warning";
  message: string;
}

interface CheckAnnotationsProps {
  annotations: Annotation[];
}

export default function CheckAnnotations({ annotations }: CheckAnnotationsProps) {
  return (
    <div className="space-y-3">
      {annotations.map((ann, idx) => (
        <div
          key={idx}
          className={`rounded-lg border p-3 ${
            ann.severity === "error"
              ? "border-red-200 bg-red-50/50"
              : "border-amber-200 bg-amber-50/50"
          }`}
        >
          <div className="flex items-start gap-3">
            {ann.severity === "error" ? (
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-gray-400" />
                  <code className="text-xs font-mono text-gray-700">
                    {ann.file}
                  </code>
                </div>
                <Badge
                  variant={ann.severity === "error" ? "destructive" : "warning"}
                  className="text-[10px]"
                >
                  Line {ann.line}
                </Badge>
              </div>
              <p className="text-sm text-gray-700">{ann.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
