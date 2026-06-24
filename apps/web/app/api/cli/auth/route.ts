import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import { randomBytes, createHash } from "crypto";

export const dynamic = "force-dynamic";

// Human-typeable device code, e.g. "WXYZ-2468". No ambiguous chars (0/O, 1/I).
function generateUserCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () => alphabet[randomBytes(1)[0] % alphabet.length];
  const block = () => Array.from({ length: 4 }, pick).join("");
  return `${block()}-${block()}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServerSupabaseClient();

    // Mode 1: Generate a key directly (from the web UI) — session required
    if (body.action === "generate") {
      const session = await requireSession(request);
      if (!session) return unauthorizedResponse();

      const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
      const keyHash = createHash("sha256").update(rawKey).digest("hex");

      const { error: insertError } = await supabase.from("api_keys").insert({
        user_id: session.id,
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

    // Mode 1b: Start a CLI device flow (no auth — pending until a logged-in user
    // approves the user_code). Returns the codes the CLI polls/displays.
    if (body.action === "device_start") {
      const deviceCode = randomBytes(32).toString("hex");
      const userCode = generateUserCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      const { error } = await supabase.from("device_auth").insert({
        device_code: deviceCode,
        user_code: userCode,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });
      if (error) {
        return NextResponse.json({ error: "Failed to start device flow" }, { status: 500 });
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lastgate.vercel.app";
      return NextResponse.json({
        device_code: deviceCode,
        user_code: userCode,
        verification_uri: `${appUrl}/cli/authorize`,
        expires_in: 600,
        interval: 5,
      });
    }

    // Mode 1c: Approve a device flow by user_code (session required — this is the
    // logged-in user authorizing the CLI on their behalf).
    if (body.action === "device_authorize") {
      const session = await requireSession(request);
      if (!session) return unauthorizedResponse();
      const userCode = String(body.user_code || "").trim().toUpperCase();
      if (!userCode) {
        return NextResponse.json({ error: "user_code is required" }, { status: 400 });
      }
      const { data, error } = await supabase
        .from("device_auth")
        .update({ status: "authorized", user_id: session.id })
        .eq("user_code", userCode)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .select("id");
      if (error || !data || data.length === 0) {
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
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
      .gt("expires_at", new Date().toISOString())
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
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    if (!session) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at")
      .eq("user_id", session.id)
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
    const session = await requireSession(request);
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    // Only revoke YOUR OWN keys — without the user_id scope any user could
    // revoke (or, via GET, enumerate) any other user's API keys by id.
    const { data, error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", id)
      .eq("user_id", session.id)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
