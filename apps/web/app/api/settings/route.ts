import { NextRequest, NextResponse } from "next/server";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { defaultRuleDefaults, sanitizeDefaults } from "@/lib/settings-defaults";

export const dynamic = "force-dynamic";

/** The caller's Global Rule Defaults (own row, scoped to the session). */
export async function GET(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("user_settings")
    .select("defaults, updated_at")
    .eq("user_id", session.id)
    .maybeSingle();

  return NextResponse.json({
    defaults: data ? sanitizeDefaults(data.defaults) : defaultRuleDefaults(),
    updated_at: data?.updated_at ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const session = await requireSession(request);
  if (!session) return unauthorizedResponse();

  const body = await request.json().catch(() => ({}));
  const defaults = sanitizeDefaults((body as { defaults?: unknown })?.defaults);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: session.id, defaults, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ defaults });
}
