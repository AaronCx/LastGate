import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_code } = body;

    if (!device_code) {
      return NextResponse.json(
        { error: "device_code is required" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Look up the device code
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

    // Generate API key
    const rawKey = `lg_cli_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const { error: insertError } = await supabase.from("api_keys").insert({
      user_id: deviceAuth.user_id,
      name: `CLI - ${new Date().toISOString().split("T")[0]}`,
      key_hash: keyHash,
      prefix: rawKey.slice(0, 12),
      revoked: false,
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to generate API key" },
        { status: 500 }
      );
    }

    // Mark device auth as consumed
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

// GET endpoint for initiating device flow
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const deviceCode = randomBytes(4).toString("hex").toUpperCase();
    const userCode = `${randomBytes(2).toString("hex").toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;

    const { error } = await supabase.from("device_auth").insert({
      device_code: deviceCode,
      user_code: userCode,
      status: "pending",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
    });

    if (error) {
      return NextResponse.json(
        { error: "Failed to create device auth" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return NextResponse.json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${baseUrl}/cli/authorize`,
      expires_in: 900,
      interval: 5,
    });
  } catch (error) {
    console.error("Device flow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
