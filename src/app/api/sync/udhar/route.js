import { NextResponse } from "next/server";
import { syncUdharToSupabase } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request) {
  try {
    const { operations } = await request.json();

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json(
        { success: false, error: "Invalid operations" },
        { status: 400 },
      );
    }

    console.log("[API] Syncing udhar, operations:", operations.length);
    const updated = await syncUdharToSupabase(operations);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Sync udhar failed:", error);
    return NextResponse.json(
      { success: false, error: "Sync failed: " + error.message },
      { status: 500 },
    );
  }
}
