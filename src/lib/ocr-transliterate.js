import Sanscript from "@indic-transliteration/sanscript";
import { normalizeToStorageKey } from "./image-url";
import {
  buildOcrEntry,
  devanagariToLatin,
  normalizeOcrEntry,
  normalizeRomanForSearch,
} from "./ocr-entry";

export { buildOcrEntry, devanagariToLatin, normalizeOcrEntry, normalizeRomanForSearch };

const DEVANAGARI_RE = /[\u0900-\u097F]/;

/** Loosen typed Roman (e.g. "dukan" → try "dukana") for Sanscript itrans */
export function relaxRomanInputForItrans(query) {
  const base = normalizeRomanForSearch(query);
  if (!base) return [];
  const variants = new Set([base]);
  const words = base.split(" ");
  for (const word of words) {
    if (word.length < 3) continue;
    variants.add(`${word}a`);
    variants.add(`${word}aa`);
    if (word.endsWith("a") && word.length > 3) {
      variants.add(word.slice(0, -1));
    }
  }
  variants.add(words.join(" "));
  return [...variants];
}

export function latinQueryToDevanagariVariants(query) {
  const variants = new Set();
  if (!query?.trim() || DEVANAGARI_RE.test(query)) return [];

  for (const relaxed of relaxRomanInputForItrans(query)) {
    for (const scheme of ["itrans", "iast", "hk"]) {
      try {
        const dev = Sanscript.t(relaxed, scheme, "devanagari");
        if (dev) variants.add(dev);
      } catch {
        /* ignore invalid roman */
      }
    }
  }
  return [...variants];
}

/** Rich map: storage key → { text, latin? } */
export function normalizeImageOcrMapRich(map) {
  if (!map || typeof map !== "object" || Array.isArray(map)) return {};
  const out = {};
  for (const [key, value] of Object.entries(map)) {
    const normKey =
      key && !key.startsWith("http")
        ? normalizeToStorageKey(key) || key
        : normalizeToStorageKey(key) || null;
    if (!normKey) continue;
    const entry = normalizeOcrEntry(value);
    if (entry) out[normKey] = entry;
  }
  return out;
}

/** Plain text map for backwards-compatible consumers */
export function flattenOcrMapForPersistence(richMap) {
  const rich = normalizeImageOcrMapRich(richMap);
  const out = {};
  for (const [key, entry] of Object.entries(rich)) {
    if (entry.latin) {
      out[key] = { text: entry.text, latin: entry.latin };
    } else {
      out[key] = entry.text;
    }
  }
  return out;
}

/** Match typed notes/items: Hindi in data, English (or Hindi) in search box */
export function textMatchesIndicSearch(text, query) {
  const q = query.trim();
  if (!q || !text) return false;

  const textLower = String(text).toLowerCase();
  const qLower = q.toLowerCase();
  if (textLower.includes(qLower)) return true;

  const qRoman = normalizeRomanForSearch(q);
  const textLatin = devanagariToLatin(text);
  if (textLatin && qRoman && textLatin.includes(qRoman)) return true;

  for (const dev of latinQueryToDevanagariVariants(q)) {
    if (textLower.includes(dev.toLowerCase())) return true;
  }
  return false;
}

export function entryNeedsOcr(value, { force = false } = {}) {
  if (force) return true;
  const entry = normalizeOcrEntry(value);
  if (!entry?.text) return true;
  if (!entry.latin && DEVANAGARI_RE.test(entry.text)) return true;
  return false;
}

export function ocrMapMatchesQuery(query, ocrMap) {
  const q = query.trim();
  if (!q) return false;

  const qLower = q.toLowerCase();
  const qRoman = normalizeRomanForSearch(q);
  const devVariants = latinQueryToDevanagariVariants(q);

  for (const entry of Object.values(normalizeImageOcrMapRich(ocrMap))) {
    const textLower = entry.text.toLowerCase();
    if (textLower.includes(qLower)) return true;

    if (entry.latin && qRoman) {
      if (entry.latin.includes(qRoman)) return true;
    }

    for (const dev of devVariants) {
      if (textLower.includes(dev.toLowerCase())) return true;
    }
  }
  return false;
}
