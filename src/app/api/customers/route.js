import { NextResponse } from "next/server";
import { loadCustomers } from "@/lib/blob-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const customers = await loadCustomers();
    return NextResponse.json(
      { success: true, data: customers || [] },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    console.error("Load customers failed:", error);
    return NextResponse.json(
      { success: false, error: error.message, data: [] },
      { status: 500 },
    );
  }
}
