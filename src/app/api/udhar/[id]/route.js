import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Helper to convert camelCase to snake_case
const toSnakeCase = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    acc[snakeKey] = toSnakeCase(obj[key]);
    return acc;
  }, {});
};

// Helper to convert snake_case to camelCase
const toCamelCase = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {});
};

// Helper to update customer's total pending
async function updateCustomerTotalPending(customerId) {
  const { data: udharRecords } = await supabase
    .from("udhar")
    .select("*")
    .eq("customer_id", customerId);

  const totalPending = (udharRecords || [])
    .filter((u) => u.payment_status !== "paid")
    .reduce((sum, u) => {
      const total = u.amount || (u.cash_amount || 0) + (u.online_amount || 0);
      const paid = u.paid_amount || (u.paid_cash || 0) + (u.paid_online || 0);
      return sum + Math.max(0, total - paid);
    }, 0);

  await supabase
    .from("customers")
    .update({
      total_pending: totalPending,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);
}

export async function GET(request, { params }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from("udhar")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: toCamelCase(data),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Get the current udhar to find customer ID
    const { data: currentUdhar } = await supabase
      .from("udhar")
      .select("customer_id")
      .eq("id", id)
      .single();

    const updates = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    const record = toSnakeCase(updates);

    const { data, error } = await supabase
      .from("udhar")
      .update(record)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update udhar failed:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    // Update customer's total pending
    if (currentUdhar?.customer_id) {
      await updateCustomerTotalPending(currentUdhar.customer_id);
    }

    return NextResponse.json({
      success: true,
      data: toCamelCase(data),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    const { id } = await params;

    // Get the udhar to find customer ID before deleting
    const { data: udhar } = await supabase
      .from("udhar")
      .select("customer_id")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("udhar").delete().eq("id", id);

    if (error) {
      console.error("Delete udhar failed:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    // Update customer's total pending
    if (udhar?.customer_id) {
      await updateCustomerTotalPending(udhar.customer_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
