import { NextResponse } from "next/server";
import { loadTransactions } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const transactions = await loadTransactions();
    return NextResponse.json(
      { success: true, data: transactions || [] },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    console.error("Load transactions failed:", error);
    return NextResponse.json(
      { success: false, error: error.message, data: [] },
      { status: 500 },
    );
  }
}
