import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { deleteImagesFromStorage, collectTransactionImages } from "@/lib/imagekit-server";
import {
  buildImageRefIndex,
  findRemovedImageRefs,
  isImageRefInIndex,
} from "@/lib/image-url";
import { validatePersistedImagesOnPutBody } from "@/lib/validation";

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

    const imageValidation = validatePersistedImagesOnPutBody(body);
    if (!imageValidation.ok) {
      return NextResponse.json({ success: false, error: imageValidation.error }, { status: 400 });
    }

    const supabase = getServerClient();

    // Get existing transaction to check for image changes
    const { data: existingTransaction } = await supabase
      .from("transactions")
      .select("bill_images, payments")
      .eq("id", id)
      .single();

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

    // Clean up old images that were removed (best-effort, non-blocking).
    // Only diff image fields explicitly sent in the PUT body — partial updates
    // (e.g. recordPayment) must not treat omitted billImages as [].
    if (existingTransaction) {
      const imagesToDelete = [];

      if (Object.prototype.hasOwnProperty.call(body, "billImages")) {
        imagesToDelete.push(
          ...findRemovedImageRefs(
            existingTransaction.bill_images || [],
            record.bill_images || []
          )
        );
      }

      if (Object.prototype.hasOwnProperty.call(body, "payments")) {
        const oldPayments = existingTransaction.payments || [];
        const newPayments = record.payments || [];
        const newReceiptRefs = [];
        newPayments.forEach(p => {
          if (p.receiptUrl || p.receipt_url) newReceiptRefs.push(p.receiptUrl || p.receipt_url);
          newReceiptRefs.push(...(p.receiptUrls || p.receipt_urls || []));
          if (p.receiptKey || p.receipt_key) newReceiptRefs.push(p.receiptKey || p.receipt_key);
        });
        const newReceiptIndex = buildImageRefIndex(newReceiptRefs);

        oldPayments.forEach(payment => {
          const receiptUrl = payment.receiptUrl || payment.receipt_url;
          if (receiptUrl && !isImageRefInIndex(receiptUrl, newReceiptIndex)) {
            imagesToDelete.push(receiptUrl);
          }
          const oldReceipts = payment.receiptUrls || payment.receipt_urls || [];
          oldReceipts.forEach(url => {
            if (url && !isImageRefInIndex(url, newReceiptIndex)) imagesToDelete.push(url);
          });
        });
      }

      if (imagesToDelete.length > 0) {
        deleteImagesFromStorage(imagesToDelete).catch(err => {
          console.error("[Transaction Update] Image cleanup error:", err);
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

    // Get transaction data for images before deleting
    const { data: transaction } = await supabase
      .from("transactions")
      .select("bill_images, payments")
      .eq("id", id)
      .single();

    // Collect and delete images from R2 storage (best-effort)
    if (transaction) {
      const imagesToDelete = collectTransactionImages(transaction);
      if (imagesToDelete.length > 0) {
        deleteImagesFromStorage(imagesToDelete).catch(err => {
          console.error("[Transaction Delete] Storage cleanup error:", err);
        });
      }
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
