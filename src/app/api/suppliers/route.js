import { NextResponse } from "next/server";
import { loadSuppliers } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const suppliers = await loadSuppliers();
    return NextResponse.json(
      { success: true, data: suppliers || [] },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    console.error("Load suppliers failed:", error);
    return NextResponse.json(
      { success: false, error: error.message, data: [] },
      { status: 500 },
    );
  }
}
