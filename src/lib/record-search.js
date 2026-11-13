import { ocrMapMatchesQuery, textMatchesIndicSearch } from "@/lib/ocr-transliterate";

function billOcrFromRecord(record) {
  return record?.billImageOcr || record?.bill_image_ocr || {};
}

function khataOcrFromRecord(record) {
  return record?.khataImageOcr || record?.khata_image_ocr || {};
}

/**
 * Match a supplier transaction or customer udhar row against a search query.
 * Includes OCR text from uploaded bill/khata images.
 */
export function recordMatchesBillSearch(record, query) {
  if (!query?.trim()) return true;
  const q = query.toLowerCase().trim();

  const amount = (record?.amount ?? record?.cashAmount ?? "").toString();
  if (amount.includes(q)) return true;

  if (textMatchesIndicSearch(record?.itemName, query)) return true;

  const notes = record?.notes || record?.itemDescription || "";
  if (textMatchesIndicSearch(notes, query)) return true;

  const status = (record?.paymentStatus || "").toLowerCase();
  if (status.includes(q)) return true;

  if (ocrMapMatchesQuery(query, billOcrFromRecord(record))) return true;
  if (ocrMapMatchesQuery(query, khataOcrFromRecord(record))) return true;

  return false;
}
