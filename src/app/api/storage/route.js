import { NextResponse } from "next/server";
import { getR2StorageStats, isR2Configured } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isR2Configured()) {
      return NextResponse.json({
        success: false,
        error: "R2 storage not configured",
      });
    }

    const result = await getR2StorageStats();

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to fetch storage info",
      });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("[Storage API] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
