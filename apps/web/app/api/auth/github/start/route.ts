import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { OAUTH_STATE_COOKIE } from "@/lib/oauth";

export const dynamic = "force-dynamic";

/**
 * Begin the GitHub OAuth flow. Generates a CSRF `state` nonce, stores it in an
 * httpOnly cookie, and redirects to GitHub's authorize URL with that state — so
 * the callback can prove the response belongs to a flow this browser started
 * (login-CSRF defense the old client-built URL lacked entirely).
 */
export async function GET(request: NextRequest) {
  const clientId =
    process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID || "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const state = randomBytes(16).toString("hex");

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", `${appUrl}/callback`);
  authorizeUrl.searchParams.set("scope", "read:user user:email");
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });
  return res;
}
