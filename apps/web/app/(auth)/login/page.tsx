"use client";

import { Shield, Github } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const handleGitHubLogin = () => {
    // Go through the server start route so a CSRF `state` nonce is generated and
    // stored in an httpOnly cookie before redirecting to GitHub.
    window.location.href = "/api/auth/github/start";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gray-900">LastGate</span>
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back
          </h1>
          <p className="mt-2 text-gray-600">
            Sign in to manage your repository checks
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <button
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
          >
            <Github className="h-5 w-5" />
            Sign in with GitHub
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our{" "}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <button
            onClick={handleGitHubLogin}
            className="text-primary font-medium hover:underline"
          >
            Sign up with GitHub
          </button>
        </p>
      </div>
    </div>
  );
}
