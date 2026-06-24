import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSession, sessionCookieOptions } from "@/lib/auth";
import { encryptSecret, safeEqual } from "@/lib/crypto";
import { OAUTH_STATE_COOKIE } from "@/app/api/auth/github/start/route";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();
    // redirect_uri must be a server-trusted constant, never the client-supplied
    // Origin header (which an attacker controls).
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "";

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      );
    }

    // CSRF: the state echoed back by GitHub must match the nonce we set in an
    // httpOnly cookie when the flow started. Without this an attacker can bind a
    // victim's browser to an attacker-controlled GitHub identity (login CSRF).
    const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
    if (!state || !expectedState || !safeEqual(String(state), expectedState)) {
      return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${appUrl}/callback`,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("GitHub OAuth error:", tokenData);
      return NextResponse.json(
        { error: `${tokenData.error}: ${tokenData.error_description || "OAuth exchange failed"}` },
        { status: 400 }
      );
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    const userData = await userResponse.json();

    // Store/update user in Supabase
    const supabase = createServerSupabaseClient();

    const { data: user, error: userError } = await supabase
      .from("users")
      .upsert(
        {
          github_id: userData.id,
          github_username: userData.login,
          avatar_url: userData.avatar_url,
          email: userData.email,
          // Encrypt the GitHub OAuth token at rest (the column comment always
          // claimed "encrypted"; now it actually is).
          access_token: encryptSecret(accessToken),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "github_id" }
      )
      // Project ONLY non-sensitive columns — never echo access_token (or any
      // secret) back to the browser.
      .select("id, github_username, avatar_url, email")
      .single();

    if (userError || !user) {
      console.error("Failed to upsert user:", userError);
      return NextResponse.json(
        { error: "Failed to create user session" },
        { status: 500 }
      );
    }

    // Mint an opaque session token (the cookie is NOT the user id) and set it.
    const sessionToken = await createSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set("lastgate_session", sessionToken, sessionCookieOptions());
    // One-time state nonce — clear it.
    response.cookies.set(OAUTH_STATE_COOKIE, "", { maxAge: 0, path: "/" });

    return response;
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
