"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ReviewActionsProps {
  runId: string;
}

export default function ReviewActions({ runId }: ReviewActionsProps) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleAction = async (action: string) => {
    if (confirming !== action) {
      setConfirming(action);
      setResult(null);
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch(`/api/checks/${runId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Request failed with status ${res.status}`
        );
      }

      setResult({
        type: "success",
        message: `Action "${action}" completed successfully.`,
      });
    } catch (err) {
      setResult({
        type: "error",
        message:
          err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setSubmitting(false);
      setConfirming(null);
    }
  };

  return (
    <Card className="!bg-lg-surface !border-lg-border !ring-0">
      <CardHeader>
        <CardTitle className="text-lg">Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => handleAction("approve")}
            disabled={submitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting && confirming === "approve" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {confirming === "approve" ? "Confirm Approve?" : "Approve"}
          </Button>
          <Button
            onClick={() => handleAction("request-changes")}
            disabled={submitting}
            variant="destructive"
            className="flex-1"
          >
            {submitting && confirming === "request-changes" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {confirming === "request-changes"
              ? "Confirm Request Changes?"
              : "Request Changes"}
          </Button>
        </div>
        {confirming && !submitting && (
          <p className="text-xs text-lg-text-muted mt-2 text-center">
            Click again to confirm, or click a different action to cancel.
          </p>
        )}
        {result && (
          <p
            className={`text-xs mt-2 text-center ${
              result.type === "success" ? "text-lg-pass" : "text-lg-fail"
            }`}
          >
            {result.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
