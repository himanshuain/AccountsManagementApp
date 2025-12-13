import { NextResponse } from "next/server";
import { loadUdhar } from "@/lib/blob-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const udhar = await loadUdhar();
    return NextResponse.json(
      { success: true, data: udhar || [] },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    console.error("Load udhar failed:", error);
    return NextResponse.json(
      { success: false, error: error.message, data: [] },
      { status: 500 },
    );
  }
}
