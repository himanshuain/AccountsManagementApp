import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getServerClient } from "@/lib/supabase";
import { existsInR2, isR2Configured } from "@/lib/r2-storage";
import {
  isStorageKey,
  normalizeToStorageKey,
  resolveImageUrl,
  isDataUrl,
} from "@/lib/image-url";

export const dynamic = "force-dynamic";

function collectRefsFromTransaction(t) {
  const refs = [];
  if (Array.isArray(t.bill_images)) refs.push(...t.bill_images);
  if (Array.isArray(t.payments)) {
    t.payments.forEach(p => {
      if (p.receiptUrl) refs.push(p.receiptUrl);
      if (p.receipt_url) refs.push(p.receipt_url);
      if (Array.isArray(p.receiptUrls)) refs.push(...p.receiptUrls);
      if (Array.isArray(p.receipt_urls)) refs.push(...p.receipt_urls);
    });
  }
  return refs.filter(r => r && typeof r === "string" && !isDataUrl(r));
}

/**
 * GET /api/images/health
 * Reports how many stored image refs are missing from R2 (likely deleted / never uploaded).
 * Optional: ?limit=50 (default 100 transactions, newest first)
 */
export async function GET(request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    const supabase = getServerClient();
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("id, date, bill_images, payments, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const r2Configured = isR2Configured();
    const samples = [];
    let totalRefs = 0;
    let missingInR2 = 0;
    let legacyFullUrls = 0;
    let storageKeys = 0;

    for (const txn of transactions || []) {
      for (const ref of collectRefsFromTransaction(txn)) {
        totalRefs++;
        const key = normalizeToStorageKey(ref);
        if (isStorageKey(ref) || isStorageKey(key)) storageKeys++;
        else if (ref.startsWith("http")) legacyFullUrls++;

        let exists = null;
        if (r2Configured && isStorageKey(key)) {
          exists = await existsInR2(key);
          if (!exists) {
            missingInR2++;
            if (samples.length < 20) {
              samples.push({
                transactionId: txn.id,
                date: txn.date,
                createdAt: txn.created_at,
                ref,
                storageKey: key,
                resolvedUrl: resolveImageUrl(ref),
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        transactionsScanned: transactions?.length || 0,
        totalImageRefs: totalRefs,
        storageKeyRefs: storageKeys,
        legacyUrlRefs: legacyFullUrls,
        missingInR2,
        r2Configured,
        note:
          missingInR2 > 0
            ? "These files are still listed in the database but no longer exist in R2. They were likely removed by storage cleanup or a bad edit — not by URL expiry."
            : "All checked storage keys exist in R2.",
        samples,
      },
    });
  } catch (error) {
    console.error("[Images Health]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
