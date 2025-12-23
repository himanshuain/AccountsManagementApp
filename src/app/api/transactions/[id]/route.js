import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { deleteImagesFromImageKit, collectTransactionImages } from "@/lib/imagekit-server";

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

export async function GET(request, { params }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const supabase = getServerClient();

    const { data, error } = await supabase.from("transactions").select("*").eq("id", id).single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: toCamelCase(data),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Clean up empty date fields - Postgres doesn't accept empty strings for date type
    const cleanedBody = { ...body };
    if (cleanedBody.dueDate === "" || cleanedBody.dueDate === null) {
      delete cleanedBody.dueDate;
    }
    if (cleanedBody.date === "") {
      delete cleanedBody.date;
    }

    const updates = {
      ...cleanedBody,
      updatedAt: new Date().toISOString(),
    };

    const record = toSnakeCase(updates);

    const supabase = getServerClient();
    const { data, error } = await supabase
      .from("transactions")
      .update(record)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update transaction failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: toCamelCase(data),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const supabase = getServerClient();

    // Get transaction data for images before deleting
    const { data: transaction } = await supabase
      .from("transactions")
      .select("bill_images, payments")
      .eq("id", id)
      .single();

    // Collect and delete images from ImageKit (best-effort)
    if (transaction) {
      const imagesToDelete = collectTransactionImages(transaction);
      deleteImagesFromImageKit(imagesToDelete).catch(err => {
        console.error("[Transaction Delete] ImageKit cleanup error:", err);
      });
    }

    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      console.error("Delete transaction failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
