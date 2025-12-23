import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { udharSchema, validateBody } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Helper to convert camelCase to snake_case
const toSnakeCase = obj => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);

  return Object.keys(obj).reduce((acc, key) => {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    acc[snakeKey] = toSnakeCase(obj[key]);
    return acc;
  }, {});
};

// Helper to convert snake_case to camelCase
const toCamelCase = obj => {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);

  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {});
};

// Helper to update customer's total pending
async function updateCustomerTotalPending(customerId) {
  const supabase = getServerClient();
  const { data: udharRecords } = await supabase
    .from("udhar")
    .select("*")
    .eq("customer_id", customerId);

  const totalPending = (udharRecords || [])
    .filter(u => u.payment_status !== "paid")
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

export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured", data: [] },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "0", 10); // 0 = no limit (backward compatible)
    const offset = (page - 1) * (limit || 0);

    const supabase = getServerClient();
    let query = supabase
      .from("udhar")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false });

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    // Apply pagination only if limit is specified
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Load udhar failed:", error);
      return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
    }

    const responseData = {
      success: true,
      data: (data || []).map(toCamelCase),
    };

    // Include pagination metadata if limit was specified
    if (limit > 0) {
      responseData.pagination = {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + (data?.length || 0) < (count || 0),
      };
    }

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("Load udhar failed:", error);
    return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = validateBody(body, udharSchema);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const now = new Date().toISOString();

    const udharData = {
      ...validation.data,
      id: validation.data.id || crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      paymentStatus: validation.data.paymentStatus || "pending",
    };

    const record = toSnakeCase(udharData);

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("udhar")
      .upsert(record, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Create udhar failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Update customer's total pending
    if (validation.data.customerId) {
      await updateCustomerTotalPending(validation.data.customerId);
    }

    return NextResponse.json({
      success: true,
      data: toCamelCase(data),
    });
  } catch (error) {
    console.error("Create udhar failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
