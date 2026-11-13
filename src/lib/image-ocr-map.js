import { normalizeToStorageKey } from "./image-url";
import { isWorthStoringOcr } from "./ocr-quality";
import {
  buildOcrEntry,
  flattenOcrMapForPersistence,
  normalizeImageOcrMapRich,
} from "./ocr-transliterate";

/** Folders where uploads should run bill/khata OCR */
export const OCR_UPLOAD_FOLDERS = new Set(["bills", "receipts", "khata", "payments"]);

export function storageKeyForOcrMap(ref) {
  if (!ref || typeof ref !== "string") return null;
  return normalizeToStorageKey(ref) || ref;
}

/** Keep only OCR entries for images still referenced */
export function pruneImageOcrMap(ocrMap, imageRefs) {
  const rich = normalizeImageOcrMapRich(ocrMap);
  const refs = (imageRefs || []).map(storageKeyForOcrMap).filter(Boolean);
  if (refs.length === 0) return {};

  const refSet = new Set(refs);
  const kept = {};
  for (const [key, entry] of Object.entries(rich)) {
    if (refSet.has(key)) {
      kept[key] = entry.latin ? { text: entry.text, latin: entry.latin } : entry.text;
    }
  }
  return kept;
}

export function mergeImageOcrMaps(...maps) {
  const merged = {};
  for (const map of maps) {
    const rich = normalizeImageOcrMapRich(map);
    for (const [key, entry] of Object.entries(rich)) {
      merged[key] = entry;
    }
  }
  return flattenOcrMapForPersistence(merged);
}

/** Merge upload OCR snippets into a map keyed by storage key */
export function applyUploadOcrResults(ocrMap, storageKeys, ocrTexts) {
  const rich = { ...normalizeImageOcrMapRich(ocrMap) };
  (storageKeys || []).forEach((key, i) => {
    const norm = storageKeyForOcrMap(key);
    const text = ocrTexts?.[i];
    if (!norm || typeof text !== "string" || !text.trim()) return;
    const entry = buildOcrEntry(text);
    if (entry) rich[norm] = entry;
  });
  return flattenOcrMapForPersistence(rich);
}

/** Add / refresh romanized `latin` fields without re-running OCR */
export function enrichImageOcrMapLatin(ocrMap) {
  const rich = normalizeImageOcrMapRich(ocrMap);
  let changed = false;
  for (const [key, entry] of Object.entries(rich)) {
    const refreshed = buildOcrEntry(entry.text);
    if (!refreshed) {
      delete rich[key];
      changed = true;
      continue;
    }
    if (refreshed.latin !== entry.latin || refreshed.text !== entry.text) {
      rich[key] = refreshed;
      changed = true;
    }
  }
  return changed ? flattenOcrMapForPersistence(rich) : flattenOcrMapForPersistence(ocrMap);
}

export function getOcrEntryForImageRef(ocrMap, imageRef) {
  const key = storageKeyForOcrMap(imageRef);
  if (!key) return null;
  const rich = normalizeImageOcrMapRich(ocrMap);
  const entry = rich[key];
  if (!entry?.text) return null;
  if (!isWorthStoringOcr(entry.text.replace(/\n/g, " "))) return null;
  return entry;
}

/** Bill + khata OCR on a transaction / udhar row */
export function mergeTxnImageOcrMaps(txn) {
  if (!txn) return {};
  const bill = txn.billImageOcr || txn.bill_image_ocr || {};
  const khata = txn.khataImageOcr || txn.khata_image_ocr || {};
  return mergeImageOcrMaps(bill, khata);
}

export { entryNeedsOcr } from "./ocr-transliterate";
