/**
 * OCR map helpers for CLI scripts (mirrors src/lib/ocr-transliterate + image-ocr-map).
 */
import Sanscript from "@indic-transliteration/sanscript";

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const MOSTLY_ASCII_RE = /^[\x00-\x7F]*$/;

export function normalizeRomanForSearch(value) {
  if (!value) return "";
  return String(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function relaxRomanInputForItrans(query) {
  const base = normalizeRomanForSearch(query);
  if (!base) return [];
  const variants = new Set([base]);
  for (const word of base.split(" ")) {
    if (word.length < 3) continue;
    variants.add(`${word}a`);
    variants.add(`${word}aa`);
    if (word.endsWith("a") && word.length > 3) variants.add(word.slice(0, -1));
  }
  return [...variants];
}

export function devanagariToLatin(text) {
  if (!text || !DEVANAGARI_RE.test(text)) return "";
  try {
    const itrans = Sanscript.t(text, "devanagari", "itrans");
    const hk = Sanscript.t(text, "devanagari", "hk");
    return [normalizeRomanForSearch(itrans), normalizeRomanForSearch(hk)].filter(Boolean).join(" ");
  } catch {
    return "";
  }
}

export function buildOcrEntry(rawText) {
  const text = String(rawText || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  const fromDev = devanagariToLatin(text);
  const fromRoman = MOSTLY_ASCII_RE.test(text) ? normalizeRomanForSearch(text) : "";
  const latin = [fromDev, fromRoman].filter(Boolean).join(" ").trim();
  return latin ? { text, latin } : { text };
}

export function normalizeOcrEntry(value) {
  if (typeof value === "string" && value.trim()) {
    return buildOcrEntry(value) || { text: value.trim() };
  }
  if (value && typeof value === "object" && typeof value.text === "string" && value.text.trim()) {
    const entry = buildOcrEntry(value.text);
    if (!entry) return null;
    if (typeof value.latin === "string" && value.latin.trim()) {
      const merged = [normalizeRomanForSearch(value.latin), entry.latin || ""].filter(Boolean).join(" ");
      if (merged) entry.latin = merged;
    }
    return entry;
  }
  return null;
}

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
