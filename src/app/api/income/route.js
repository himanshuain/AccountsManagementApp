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

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured", data: [] },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("income")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Load income failed:", error);
      return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, data: (data || []).map(toCamelCase) },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Load income failed:", error);
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

    const incomeData = {
      ...body,
      id: body.id || crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const record = toSnakeCase(incomeData);

    const { data, error } = await supabase
      .from("income")
      .upsert(record, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Create income failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: toCamelCase(data),
    });
  } catch (error) {
    console.error("Create income failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
