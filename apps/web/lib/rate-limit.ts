import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Best-effort client IP from the proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Atomic fixed-window rate limit. Returns true if the request is allowed.
 * Fails OPEN on any error — a limiter outage must never lock users out.
 */
export async function rateLimit(
  bucket: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_sec: windowSec,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** 429 helper. */
export function tooManyRequests(): NextResponse {
  return NextResponse.json(
    { error: "Too many requests — slow down and try again shortly." },
    { status: 429 },
  );
}
