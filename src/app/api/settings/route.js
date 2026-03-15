import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET: Read app settings
 * Query: ?key=backup_email (optional, returns all if omitted)
 */
export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const supabase = getServerClient();
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    let query = supabase.from("app_settings").select("*");
    if (key) query = query.eq("key", key).single();

    const { data, error } = await query;

    if (error && error.code === "PGRST116") {
      return NextResponse.json({ success: true, data: null });
    }

    if (error) {
      if (error.message?.includes("does not exist")) {
        return NextResponse.json({
          success: false,
          error: "app_settings table not created yet. Run the migration SQL.",
          setupRequired: true,
        }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Settings API] GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT: Upsert a setting
 * Body: { key: string, value: string }
 */
export async function PUT(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const supabase = getServerClient();
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Key is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) {
      if (error.message?.includes("does not exist")) {
        return NextResponse.json({
          success: false,
          error: "app_settings table not created yet. Run the migration SQL.",
          setupRequired: true,
        }, { status: 500 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, message: `Setting '${key}' saved` });
  } catch (error) {
    console.error("[Settings API] PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
