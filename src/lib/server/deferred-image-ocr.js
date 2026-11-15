import { after } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { syncImageOcrForRefs } from "@/lib/server/image-ocr-sync";

function scheduleAfter(task) {
  const run = () => {
    task().catch(err => {
      console.error("[OCR defer] background task failed:", err?.message || err);
    });
  };
  try {
    after(run);
  } catch (err) {
    console.warn("[OCR defer] after() unavailable, running inline:", err?.message || err);
    run();
  }
}

/** Run bill OCR after the HTTP response (search text fills in shortly after save). */
export function deferTransactionBillOcr(transactionId, billImages, existingOcrMap, clientOcrMap) {
  if (!transactionId || !billImages?.length) return;

  scheduleAfter(async () => {
    try {
      const billImageOcr = await syncImageOcrForRefs(
        billImages,
        existingOcrMap || {},
        clientOcrMap || {}
      );
      const supabase = getServerClient();
      const { error } = await supabase
        .from("transactions")
        .update({
          bill_image_ocr: billImageOcr,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      if (error) {
        console.error("[OCR defer] transaction update failed:", error.message);
      } else {
        console.log("[OCR defer] transaction bill OCR updated:", transactionId);
      }
    } catch (err) {
      console.error("[OCR defer] transaction:", err?.message || err);
    }
  });
}

export function deferUdharKhataOcr(udharId, khataPhotos, existingOcrMap, clientOcrMap) {
  if (!udharId || !khataPhotos?.length) return;

  scheduleAfter(async () => {
    try {
      const khataImageOcr = await syncImageOcrForRefs(
        khataPhotos,
        existingOcrMap || {},
        clientOcrMap || {}
      );
      const supabase = getServerClient();
      const { error } = await supabase
        .from("udhar")
        .update({
          khata_image_ocr: khataImageOcr,
          updated_at: new Date().toISOString(),
        })
        .eq("id", udharId);

      if (error) {
        console.error("[OCR defer] udhar update failed:", error.message);
      }
    } catch (err) {
      console.error("[OCR defer] udhar:", err?.message || err);
    }
  });
}