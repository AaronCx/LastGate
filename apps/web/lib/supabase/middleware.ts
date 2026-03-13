import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "./server";

export async function validateSession(request: NextRequest) {
  const sessionId = request.cookies.get("lastgate_session")?.value;

  if (!sessionId) {
    return null;
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, login, name, avatar_url")
      .eq("id", sessionId)
      .single();

    if (error || !user) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
