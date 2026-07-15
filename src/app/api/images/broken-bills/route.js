import { NextResponse } from "next/server";
import { isSupabaseConfigured, getServerClient } from "@/lib/supabase";
import { isBillImageBroken } from "@/lib/image-health";
import { resolveImageUrl, isDataUrl } from "@/lib/image-url";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/images/broken-bills
 * Bills that fail to load in the app (CDN 404, or missing from R2 when CDN unreachable).
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const supabase = getServerClient();
    const { data: transactions, error: txnError } = await supabase
      .from("transactions")
      .select("id, supplier_id, date, amount, bill_images, created_at, updated_at")
      .not("bill_images", "eq", "[]")
      .order("date", { ascending: false });

    if (txnError) {
      return NextResponse.json({ success: false, error: txnError.message }, { status: 500 });
    }

    const supplierIds = [
      ...new Set((transactions || []).map(t => t.supplier_id).filter(Boolean)),
    ];

    const supplierNameById = new Map();
    if (supplierIds.length > 0) {
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id, name, company_name")
        .in("id", supplierIds);
      for (const s of suppliers || []) {
        supplierNameById.set(s.id, s.company_name || s.name || "Unknown supplier");
      }
    }

    let totalBillRefs = 0;
    let healthyRefs = 0;
    const broken = [];

    for (const txn of transactions || []) {
      const refs = (txn.bill_images || []).filter(
        r => r && typeof r === "string" && !isDataUrl(r)
      );
      if (refs.length === 0) continue;

      const missingRefs = [];
      for (const ref of refs) {
        totalBillRefs++;
        const brokenImage = await isBillImageBroken(ref);
        if (brokenImage) {
          missingRefs.push({
            ref,
            resolvedUrl: resolveImageUrl(ref),
          });
        } else {
          healthyRefs++;
        }
      }

      if (missingRefs.length > 0) {
        const wasEdited = txn.updated_at && txn.created_at && txn.updated_at !== txn.created_at;
        broken.push({
          transactionId: txn.id,
          supplierId: txn.supplier_id,
          supplierName: supplierNameById.get(txn.supplier_id) || "Unknown supplier",
          date: txn.date,
          amount: txn.amount,
          createdAt: txn.created_at,
          updatedAt: txn.updated_at,
          wasEdited,
          missingCount: missingRefs.length,
          totalBillCount: refs.length,
          missingRefs,
          reuploadUrl: txn.supplier_id
            ? `/person/supplier/${txn.supplier_id}?editTxn=${txn.id}`
            : null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        transactionsWithBills: (transactions || []).length,
        totalBillRefs,
        healthyRefs,
        brokenTransactionCount: broken.length,
        brokenBillRefs: broken.reduce((n, b) => n + b.missingCount, 0),
        note:
          broken.length > 0
            ? "Only bills that fail to load in the app are listed. Tap Re-upload (opens in a new tab), then return here and refresh the scan."
            : "All bill photos load correctly.",
        broken,
      },
    });
  } catch (error) {
    console.error("[Broken Bills]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
