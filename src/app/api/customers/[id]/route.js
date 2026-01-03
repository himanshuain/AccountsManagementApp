import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  deleteImagesFromStorage,
  collectCustomerImages,
  collectUdharImages,
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
    const supabase = getServerClient();

    const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();

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

    const supabase = getServerClient();

    // Get existing customer to check for image changes
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("profile_picture, khata_photo, khata_photos")
      .eq("id", id)
      .single();

    const updates = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    const record = toSnakeCase(updates);

    const { data, error } = await supabase
      .from("customers")
      .update(record)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update customer failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Clean up old images that were replaced (best-effort, non-blocking)
    if (existingCustomer) {
      const imagesToDelete = [];

      // Check if profile picture was replaced
      if (
        existingCustomer.profile_picture &&
        existingCustomer.profile_picture !== record.profile_picture
      ) {
        imagesToDelete.push(existingCustomer.profile_picture);
      }

      // Check if khata photo was replaced
      if (existingCustomer.khata_photo && existingCustomer.khata_photo !== record.khata_photo) {
        imagesToDelete.push(existingCustomer.khata_photo);
      }

      // Check for removed khata photos from array
      if (existingCustomer.khata_photos && Array.isArray(existingCustomer.khata_photos)) {
        const newKhataPhotos = record.khata_photos || [];
        existingCustomer.khata_photos.forEach(photo => {
          if (!newKhataPhotos.includes(photo)) {
            imagesToDelete.push(photo);
          }
        });
      }

      if (imagesToDelete.length > 0) {
        deleteImagesFromStorage(imagesToDelete).catch(err => {
          console.error("[Customer Update] Image cleanup error:", err);
        });
      }
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

    // Collect all images to delete before removing records
    const imagesToDelete = [];

    // Get customer data for images
    const { data: customer } = await supabase
      .from("customers")
      .select("profile_picture, khata_photo, khata_photos")
      .eq("id", id)
      .single();

    if (customer) {
      imagesToDelete.push(...collectCustomerImages(customer));
    }

    // Get all related udhar records and their images
    const { data: udharList } = await supabase
      .from("udhar")
      .select("khata_photos, bill_image, payments")
      .eq("customer_id", id);

    if (udharList) {
      udharList.forEach(udhar => {
        imagesToDelete.push(...collectUdharImages(udhar));
      });
    }

    // Delete images from R2 storage (best-effort, non-blocking for response)
    deleteImagesFromStorage(imagesToDelete).catch(err => {
      console.error("[Customer Delete] Storage cleanup error:", err);
    });

    // Delete related udhar records first
    await supabase.from("udhar").delete().eq("customer_id", id);

    // Delete the customer
    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      console.error("Delete customer failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
