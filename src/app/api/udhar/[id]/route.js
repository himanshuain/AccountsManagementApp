import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { deleteImagesFromStorage, collectUdharImages } from "@/lib/imagekit-server";

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

    const { data, error } = await supabase.from("udhar").select("*").eq("id", id).single();

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

    // Get the current udhar to find customer ID and check for image changes
    const { data: currentUdhar } = await supabase
      .from("udhar")
      .select("customer_id, khata_photos, bill_image, payments")
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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Clean up old images that were removed (best-effort, non-blocking)
    if (currentUdhar) {
      const imagesToDelete = [];
      
      // Check if bill image was replaced
      if (currentUdhar.bill_image && 
          currentUdhar.bill_image !== record.bill_image) {
        imagesToDelete.push(currentUdhar.bill_image);
      }
      
      // Check for removed khata photos
      const oldKhataPhotos = currentUdhar.khata_photos || [];
      const newKhataPhotos = record.khata_photos || [];
      oldKhataPhotos.forEach(photo => {
        if (!newKhataPhotos.includes(photo)) {
          imagesToDelete.push(photo);
        }
      });
      
      // Check for removed payment receipts
      const oldPayments = currentUdhar.payments || [];
      const newPayments = record.payments || [];
      
      // Collect all receipt URLs from new payments (single and array)
      const newReceiptUrls = new Set();
      newPayments.forEach(p => {
        if (p.receiptUrl || p.receipt_url) {
          newReceiptUrls.add(p.receiptUrl || p.receipt_url);
        }
        const receipts = p.receiptUrls || p.receipt_urls || [];
        receipts.forEach(url => newReceiptUrls.add(url));
      });
      
      // Find removed receipts from old payments
      oldPayments.forEach(payment => {
        // Check single receipt URL
        const receiptUrl = payment.receiptUrl || payment.receipt_url;
        if (receiptUrl && !newReceiptUrls.has(receiptUrl)) {
          imagesToDelete.push(receiptUrl);
        }
        // Check receipt URLs array
        const oldReceipts = payment.receiptUrls || payment.receipt_urls || [];
        oldReceipts.forEach(url => {
          if (url && !newReceiptUrls.has(url)) {
            imagesToDelete.push(url);
          }
        });
      });
      
      if (imagesToDelete.length > 0) {
        deleteImagesFromStorage(imagesToDelete).catch(err => {
          console.error("[Udhar Update] Image cleanup error:", err);
        });
      }
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

    // Get the udhar data including images before deleting
    const { data: udhar } = await supabase
      .from("udhar")
      .select("customer_id, khata_photos, bill_image, payments")
      .eq("id", id)
      .single();

    // Collect and delete images from R2 storage (best-effort)
    if (udhar) {
      const imagesToDelete = collectUdharImages(udhar);
      deleteImagesFromStorage(imagesToDelete).catch(err => {
        console.error("[Udhar Delete] Storage cleanup error:", err);
      });
    }

    const { error } = await supabase.from("udhar").delete().eq("id", id);

    if (error) {
      console.error("Delete udhar failed:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Update customer's total pending
    if (udhar?.customer_id) {
      await updateCustomerTotalPending(udhar.customer_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
