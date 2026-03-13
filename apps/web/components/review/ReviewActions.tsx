"use client";

import { useState } from "react";
import { CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ReviewActions() {
  const [confirming, setConfirming] = useState<string | null>(null);

  const handleAction = (action: string) => {
    if (confirming === action) {
      // Execute action
      setConfirming(null);
      alert(`Action "${action}" executed (mock)`);
    } else {
      setConfirming(action);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => handleAction("approve")}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {confirming === "approve" ? "Confirm Approve?" : "Approve"}
          </Button>
          <Button
            onClick={() => handleAction("request-changes")}
            variant="destructive"
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            {confirming === "request-changes"
              ? "Confirm Request Changes?"
              : "Request Changes"}
          </Button>
          <Button
            onClick={() => handleAction("send-back")}
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {confirming === "send-back"
              ? "Confirm Send Back?"
              : "Send Back to Agent"}
          </Button>
        </div>
        {confirming && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Click again to confirm, or click a different action to cancel.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
