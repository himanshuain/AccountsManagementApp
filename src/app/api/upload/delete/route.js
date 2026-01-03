import { NextResponse } from "next/server";
import { deleteFromR2, isR2Configured } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

/**
 * Delete an image from R2 storage
 * Used for cleanup when user removes an image from form or cancels without saving
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { storageKey } = body;

    if (!storageKey) {
      return NextResponse.json(
        { success: false, error: "No storage key provided" },
        { status: 400 }
      );
    }

    // Don't try to delete base64 data URLs
    if (storageKey.startsWith("data:")) {
      return NextResponse.json({ success: true, message: "Data URL, nothing to delete" });
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json(
        { success: false, error: "Storage not configured" },
        { status: 500 }
      );
    }

    // Validate storage key format (should be folder/filename pattern)
    const keyPattern = /^[a-z0-9-]+\/[0-9]+-[a-z0-9]+\.[a-z]+$/i;
    if (!keyPattern.test(storageKey)) {
      console.warn(`[Delete] Invalid storage key format: ${storageKey}`);
      return NextResponse.json(
        { success: false, error: "Invalid storage key format" },
        { status: 400 }
      );
    }

    // Delete from R2
    const deleted = await deleteFromR2(storageKey);

    if (deleted) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: "Failed to delete file" }, { status: 500 });
    }
  } catch (error) {
    console.error("[Delete] Failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
