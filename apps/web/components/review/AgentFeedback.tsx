"use client";

import { MessageSquare, Bot, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface CheckInfo {
  name: string;
  status: "passed" | "failed" | "warning";
  message: string;
}

interface AgentFeedbackProps {
  agent: string;
  failedChecks: CheckInfo[];
}

export default function AgentFeedback({ agent, failedChecks }: AgentFeedbackProps) {
  const feedbackLines = failedChecks.map(
    (c) => `- **${c.name}**: ${c.message}`
  );

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Agent Feedback Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-lg-text-muted mb-3">
          This feedback is automatically posted to the PR comment on every check run.
        </p>
        {failedChecks.length === 0 ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-emerald-500/20">
              <Bot className="h-4 w-4 text-lg-accent" />
              <span className="text-sm font-semibold text-lg-text">
                LastGate Bot
              </span>
              <span className="text-xs text-lg-text-muted">just now</span>
            </div>
            <div className="flex items-center gap-2 text-lg-pass">
              <CheckCircle className="h-5 w-5" />
              <p className="text-sm font-medium">
                All checks passed. No issues found for <strong>@{agent}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-lg-border bg-lg-surface-2 p-4">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-lg-border">
              <Bot className="h-4 w-4 text-lg-accent" />
              <span className="text-sm font-semibold text-lg-text">
                LastGate Bot
              </span>
              <span className="text-xs text-lg-text-muted">just now</span>
            </div>
            <div className="prose prose-sm max-w-none text-lg-text-secondary">
              <p className="text-sm mb-2">
                Hey <strong>@{agent}</strong>, LastGate found some issues with this
                PR that need to be fixed before it can be merged:
              </p>
              <div className="space-y-1 mb-3">
                {feedbackLines.map((line, idx) => (
                  <p key={idx} className="text-sm" dangerouslySetInnerHTML={{
                    __html: line
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/^- /, "")
                  }} />
                ))}
              </div>
              <p className="text-sm text-lg-text-muted italic">
                Please address these issues and push a new commit. LastGate will
                re-run all checks automatically.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
