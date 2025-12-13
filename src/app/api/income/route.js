import { NextResponse } from "next/server";
import { loadIncome } from "@/lib/blob-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const income = await loadIncome();
    return NextResponse.json(
      { success: true, data: income || [] },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    console.error("Load income failed:", error);
    return NextResponse.json(
      { success: false, error: error.message, data: [] },
      { status: 500 },
    );
  }
}
