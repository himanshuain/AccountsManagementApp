import { NextResponse } from "next/server";
import { uploadImageToSupabase } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "general";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    const url = await uploadImageToSupabase(file, folder);

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Upload failed - Supabase not configured" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
