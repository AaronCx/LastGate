"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";

function AuthorizeForm() {
  const params = useSearchParams();
  const [code, setCode] = useState((params.get("code") || "").toUpperCase());
  const [state, setState] = useState<"idle" | "ok" | "error" | "needsLogin">("idle");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/cli/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "device_authorize", user_code: code.trim() }),
      });
      if (res.status === 401) {
        setState("needsLogin");
        setMessage("Please sign in first, then re-open this page.");
      } else if (res.ok) {
        setState("ok");
        setMessage("Device authorized — you can return to your terminal.");
      } else {
        const body = await res.json().catch(() => ({}));
        setState("error");
        setMessage(body.error || "That code is invalid or has expired.");
      }
    } catch {
      setState("error");
      setMessage("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md text-center">
        <Shield className="h-10 w-10 text-blue-600 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold text-gray-900">Authorize the LastGate CLI</h1>
        <p className="mt-2 text-gray-600">
          Enter the code shown in your terminal to connect the CLI to your account.
        </p>

        {state === "ok" ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-emerald-600">
            <CheckCircle className="h-6 w-6" />
            <span className="font-medium">{message}</span>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 bg-white rounded-xl shadow-sm border p-6">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              autoFocus
              className="w-full text-center tracking-widest font-mono text-lg rounded-lg border border-gray-300 px-4 py-3"
            />
            <button
              type="submit"
              disabled={submitting || code.trim().length < 8}
              className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "Authorizing…" : "Authorize"}
            </button>
            {state === "error" || state === "needsLogin" ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{message}</span>
                {state === "needsLogin" ? (
                  <a href="/login" className="underline">Sign in</a>
                ) : null}
              </div>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}

export default function CliAuthorizePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <AuthorizeForm />
    </Suspense>
  );
}
