import { extractTextFromImage } from "@/lib/ocr";
import { getObjectFromR2, isR2Configured } from "@/lib/r2-storage";
import { isStorageKey } from "@/lib/image-url";
import { buildOcrEntry } from "@/lib/ocr-transliterate";
import {
  enrichImageOcrMapLatin,
  entryNeedsOcr,
  mergeImageOcrMaps,
  pruneImageOcrMap,
  storageKeyForOcrMap,
} from "@/lib/image-ocr-map";

/**
 * Ensure every bill/khata image ref has OCR text in the map (fetch from R2 when missing).
 */
export async function syncImageOcrForRefs(imageRefs, existingOcrMap = {}, clientOcrMap = {}) {
  let merged = mergeImageOcrMaps(existingOcrMap, clientOcrMap);
  merged = enrichImageOcrMapLatin(merged);

  const pruned = pruneImageOcrMap(merged, imageRefs);

  if (!isR2Configured()) {
    return pruned;
  }

  const refs = (imageRefs || []).map(storageKeyForOcrMap).filter(Boolean);
  const missing = refs.filter(ref => isStorageKey(ref) && entryNeedsOcr(pruned[ref]));

  if (missing.length === 0) {
    return pruned;
  }

  const filled = { ...pruned };

  for (const ref of missing) {
    try {
      const object = await getObjectFromR2(ref);
      if (!object?.data) continue;
      const text = await extractTextFromImage(object.data, { mimeType: object.contentType });
      const entry = buildOcrEntry(text);
      if (entry) {
        filled[ref] = entry.latin ? { text: entry.text, latin: entry.latin } : entry.text;
      }
    } catch (err) {
      console.warn(`[OCR] Could not OCR ${ref}:`, err?.message || err);
    }
  }

  return enrichImageOcrMapLatin(filled);
}
