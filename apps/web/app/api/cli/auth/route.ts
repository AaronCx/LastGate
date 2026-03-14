import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServerSupabaseClient();

    // Mode 1: Generate a key directly (from the web UI)
    if (body.action === "generate") {
      const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
      const keyHash = createHash("sha256").update(rawKey).digest("hex");

      const { error: insertError } = await supabase.from("api_keys").insert({
        name: body.name || `API Key - ${new Date().toISOString().split("T")[0]}`,
        key_hash: keyHash,
        key_prefix: rawKey.slice(0, 12),
      });

      if (insertError) {
        console.error("API key insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to generate API key" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        api_key: rawKey,
        message: "API key generated. Store it securely — it won't be shown again.",
      });
    }

    // Mode 2: Exchange device code for API key (CLI device flow)
    const { device_code } = body;
    if (!device_code) {
      return NextResponse.json(
        { error: "device_code or action is required" },
        { status: 400 }
      );
    }

    const { data: deviceAuth, error: lookupError } = await supabase
      .from("device_auth")
      .select("*")
      .eq("device_code", device_code)
      .eq("status", "authorized")
      .single();

    if (lookupError || !deviceAuth) {
      return NextResponse.json(
        { error: "Invalid or pending device code" },
        { status: 404 }
      );
    }

    const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const { error: insertError } = await supabase.from("api_keys").insert({
      user_id: deviceAuth.user_id,
      name: `CLI - ${new Date().toISOString().split("T")[0]}`,
      key_hash: keyHash,
      key_prefix: rawKey.slice(0, 12),
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to generate API key" },
        { status: 500 }
      );
    }

    await supabase
      .from("device_auth")
      .update({ status: "consumed" })
      .eq("id", deviceAuth.id);

    return NextResponse.json({
      api_key: rawKey,
      message: "CLI authenticated successfully. Store this API key securely.",
    });
  } catch (error) {
    console.error("CLI auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint: list API keys
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("API keys fetch error:", error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("API keys error:", error);
    return NextResponse.json({ data: [] });
  }
}

// DELETE endpoint: revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("api_keys").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete API key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
