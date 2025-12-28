import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/stats
 * Returns aggregated statistics without loading all records:
 * - Total pending amount owed to suppliers (You owe)
 * - Total pending amount owed by customers (Owed to you)
 * - Counts of suppliers and customers
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const supabase = getServerClient();

    // Run all queries in parallel for better performance
    const [
      supplierCountResult,
      customerCountResult,
      supplierPendingResult,
      customerPendingResult,
    ] = await Promise.all([
      // Count suppliers
      supabase.from("suppliers").select("*", { count: "exact", head: true }),

      // Count customers
      supabase.from("customers").select("*", { count: "exact", head: true }),

      // Sum of pending supplier transactions (amount where payment_status != 'paid')
      supabase
        .from("transactions")
        .select("amount, paid_amount, payment_status")
        .neq("payment_status", "paid"),

      // Sum of pending customer udhar (amount where payment_status != 'paid')
      supabase
        .from("udhar")
        .select("amount, cash_amount, online_amount, paid_amount, paid_cash, paid_online, payment_status")
        .neq("payment_status", "paid"),
    ]);

    // Handle errors
    if (supplierCountResult.error) {
      console.error("Failed to count suppliers:", supplierCountResult.error);
    }
    if (customerCountResult.error) {
      console.error("Failed to count customers:", customerCountResult.error);
    }
    if (supplierPendingResult.error) {
      console.error("Failed to get supplier pending:", supplierPendingResult.error);
    }
    if (customerPendingResult.error) {
      console.error("Failed to get customer pending:", customerPendingResult.error);
    }

    // Calculate supplier pending amount
    const totalSupplierPending = (supplierPendingResult.data || []).reduce((sum, t) => {
      const totalAmount = Number(t.amount) || 0;
      const paidAmount = Number(t.paid_amount) || 0;
      return sum + Math.max(0, totalAmount - paidAmount);
    }, 0);

    // Calculate customer pending amount
    const totalCustomerPending = (customerPendingResult.data || []).reduce((sum, u) => {
      const totalAmount = Number(u.amount) || (Number(u.cash_amount) || 0) + (Number(u.online_amount) || 0);
      const paidAmount = Number(u.paid_amount) || (Number(u.paid_cash) || 0) + (Number(u.paid_online) || 0);
      return sum + Math.max(0, totalAmount - paidAmount);
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        supplierCount: supplierCountResult.count || 0,
        customerCount: customerCountResult.count || 0,
        totalSupplierPending,
        totalCustomerPending,
      },
    }, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

