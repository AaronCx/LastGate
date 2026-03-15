"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";

interface BadgeGeneratorProps {
  repoFullName: string;
}

export default function BadgeGenerator({ repoFullName }: BadgeGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<"simple" | "detailed">("simple");

  const baseUrl = "https://lastgate.vercel.app";
  const badgeUrl = `${baseUrl}/api/badge/${repoFullName}${style === "detailed" ? "?style=detailed" : ""}`;
  const dashboardUrl = `${baseUrl}`;
  const markdown = `[![LastGate](${badgeUrl})](${dashboardUrl})`;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <CardHeader>
        <CardTitle className="text-lg">README Badge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setStyle("simple")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
              style === "simple" ? "bg-gray-900 text-white" : "border border-lg-border text-lg-text-secondary"
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => setStyle("detailed")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
              style === "detailed" ? "bg-gray-900 text-white" : "border border-lg-border text-lg-text-secondary"
            }`}
          >
            Detailed
          </button>
        </div>

        {/* Preview */}
        <div className="p-4 bg-lg-surface-2 rounded-lg flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={badgeUrl} alt="LastGate badge preview" />
        </div>

        {/* Markdown */}
        <div className="relative">
          <pre className="p-3 bg-gray-900 text-gray-200 rounded-lg text-xs overflow-x-auto">
            {markdown}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
