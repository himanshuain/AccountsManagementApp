import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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

export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured", data: [] },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "0", 10); // 0 = no limit (backward compatible)
    const offset = (page - 1) * (limit || 0);

    let query = supabase.from("transactions").select("*", { count: "exact" }).order("updated_at", { ascending: false });

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }

    // Apply pagination only if limit is specified
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Load transactions failed:", error);
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
    console.error("Load transactions failed:", error);
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
    const now = new Date().toISOString();

    // Clean up empty date fields - Postgres doesn't accept empty strings for date type
    const cleanedBody = { ...body };
    if (cleanedBody.dueDate === "" || cleanedBody.dueDate === null) {
      delete cleanedBody.dueDate;
    }
    if (cleanedBody.date === "" || cleanedBody.date === null) {
      cleanedBody.date = new Date().toISOString().split("T")[0];
    }

    const transactionData = {
      ...cleanedBody,
      id: cleanedBody.id || crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const record = toSnakeCase(transactionData);

    const { data, error } = await supabase
      .from("transactions")
      .upsert(record, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Create transaction failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: toCamelCase(data),
    });
  } catch (error) {
    console.error("Create transaction failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
