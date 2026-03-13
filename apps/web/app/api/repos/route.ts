import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("repos")
      .select("*")
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
          full_name,
          installation_id,
          enabled: true,
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
