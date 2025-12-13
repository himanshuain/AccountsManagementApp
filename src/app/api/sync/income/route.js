import { NextResponse } from "next/server";
import { syncIncomeToBlob } from "@/lib/blob-storage";

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

    console.log("[API] Syncing income, operations:", operations.length);
    const updated = await syncIncomeToBlob(operations);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Sync income failed:", error);
    return NextResponse.json(
      { success: false, error: "Sync failed: " + error.message },
      { status: 500 },
    );
  }
}

