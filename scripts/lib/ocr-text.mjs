/**
 * OCR map helpers for CLI scripts (shared with src/lib/ocr-transliterate).
 */
import {
  buildOcrEntry,
  devanagariToLatin,
  normalizeOcrEntry,
  normalizeRomanForSearch,
} from "./ocr-entry.mjs";

export { buildOcrEntry, devanagariToLatin, normalizeOcrEntry, normalizeRomanForSearch };

const DEVANAGARI_RE = /[\u0900-\u097F]/;

export function normalizeImageRef(ref) {
  if (!ref || typeof ref !== "string") return null;
  if (!ref.startsWith("http") && !ref.startsWith("data:")) return ref;
  if (ref.includes("ik.imagekit.io")) {
    try {
      const parts = new URL(ref).pathname.split("/").filter(Boolean);
      let start = 1;
      if (parts[1]?.startsWith("tr:")) start = 2;
      return parts.slice(start).join("/") || null;
    } catch {
      return null;
    }
  }
  return null;
}

export function normalizeOcrMapRich(map) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return {};
  const out = {};
  for (const [key, value] of Object.entries(map)) {
    const normKey = normalizeImageRef(key) || (key.startsWith("http") ? null : key);
    if (!normKey) continue;
    const entry = normalizeOcrEntry(value);
    if (entry) out[normKey] = entry;
  }
  return out;
}

export function flattenOcrMapForDb(richMap) {
  const rich = typeof richMap === "object" && !Array.isArray(richMap) ? richMap : normalizeOcrMapRich(richMap);
  const out = {};
  for (const [key, entry] of Object.entries(rich)) {
    out[key] = entry.latin ? { text: entry.text, latin: entry.latin } : entry.text;
  }
  return out;
}

function entryNeedsOcr(value, { force = false } = {}) {
  if (force) return true;
  const entry = normalizeOcrEntry(value);
  if (!entry?.text) return true;
  if (!entry.latin && DEVANAGARI_RE.test(entry.text)) return true;
  return false;
}

export function isOcrDone(value) {
  return !entryNeedsOcr(value, { force: false });
}

export function pruneOcrMap(ocrMap, imageRefs) {
  const rich = normalizeOcrMapRich(ocrMap);
  const refSet = new Set((imageRefs || []).map(normalizeImageRef).filter(Boolean));
  const kept = {};
  for (const [key, entry] of Object.entries(rich)) {
    if (refSet.has(key)) {
      kept[key] = entry.latin ? { text: entry.text, latin: entry.latin } : entry.text;
    }
  }
  return kept;
}
