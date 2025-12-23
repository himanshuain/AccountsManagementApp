import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { supplierSchema, validateBody, validateUUID } from "@/lib/validation";
import {
  deleteImagesFromImageKit,
  collectSupplierImages,
  collectTransactionImages,
} from "@/lib/imagekit-server";

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

    // Validate UUID
    if (!validateUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid supplier ID format" },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();

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

    // Validate UUID
    if (!validateUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid supplier ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = validateBody(body, supplierSchema);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const supabase = getServerClient();

    const updates = {
      ...validation.data,
      updatedAt: new Date().toISOString(),
    };

    const record = toSnakeCase(updates);

    const { data, error } = await supabase
      .from("suppliers")
      .update(record)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update supplier failed:", error);
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

    // Validate UUID
    if (!validateUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid supplier ID format" },
        { status: 400 }
      );
    }

    const supabase = getServerClient();

    // Collect all images to delete before removing records
    const imagesToDelete = [];

    // Get supplier data for images
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("profile_picture")
      .eq("id", id)
      .single();

    if (supplier) {
      imagesToDelete.push(...collectSupplierImages(supplier));
    }

    // Get all related transactions and their images
    const { data: transactions } = await supabase
      .from("transactions")
      .select("bill_images, payments")
      .eq("supplier_id", id);

    if (transactions) {
      transactions.forEach(txn => {
        imagesToDelete.push(...collectTransactionImages(txn));
      });
    }

    // Delete images from ImageKit (best-effort, non-blocking for response)
    deleteImagesFromImageKit(imagesToDelete).catch(err => {
      console.error("[Supplier Delete] ImageKit cleanup error:", err);
    });

    // Delete related transactions first
    await supabase.from("transactions").delete().eq("supplier_id", id);

    // Delete the supplier
    const { error } = await supabase.from("suppliers").delete().eq("id", id);

    if (error) {
      console.error("Delete supplier failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
