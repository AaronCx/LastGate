import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import { ownedRepoOrFilter } from "@/lib/ownership";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("repos")
      .select("*")
      // Only the caller's own repos (service-role bypasses RLS).
      .or(ownedRepoOrFilter(session))
      .order("full_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching repos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const { full_name, installation_id } = body;

    if (!full_name || !installation_id) {
      return NextResponse.json(
        { error: "full_name and installation_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("repos")
      .upsert(
        {
          // Stamp ownership so the repo is scoped to its creator (was unset,
          // leaving orphan repos no one could be checked against).
          user_id: session.id,
          full_name,
          installation_id,
          config: {
            checks: {
              secrets: { enabled: true },
              duplicates: { enabled: true },
              lint: { enabled: true },
              build: { enabled: false },
              dependencies: { enabled: true },
              patterns: { enabled: true },
            },
          },
        },
        { onConflict: "full_name" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error adding repo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const { id, is_active, config } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (typeof is_active === "boolean") updates.is_active = is_active;
    if (config) updates.config = config;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("repos")
      .update(updates)
      .eq("id", id)
      // Only update a repo the caller owns — without this any user could PATCH
      // any repo by id (flip is_active, overwrite security config).
      .or(ownedRepoOrFilter(session))
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error updating repo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
