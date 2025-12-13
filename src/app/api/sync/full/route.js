import { NextResponse } from "next/server";
import { fullSync } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request) {
  try {
    const localData = await request.json();

    const merged = await fullSync(localData);

    return NextResponse.json({ success: true, data: merged });
  } catch (error) {
    console.error("Full sync failed:", error);
    return NextResponse.json(
      { success: false, error: "Full sync failed: " + error.message },
      { status: 500 },
    );
  }
}
