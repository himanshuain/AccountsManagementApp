/** CLI mirror of src/lib/ocr-entry.js */

import Sanscript from "@indic-transliteration/sanscript";
import { cleanOcrTextMultiline, isWorthStoringOcr } from "./ocr-quality.mjs";

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const LATIN_MAX = 1200;
const HINDI_CHUNK_RE = /[\u0900-\u097F]+/g;
const OCR_WORD_RE = /[A-Za-z][A-Za-z0-9.\-/]{2,}/g;
const OCR_LONG_NUMBER_RE = /\d{3,}/g;

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

function buildLatinForSearch(text) {
  const parts = [];
  for (const chunk of text.match(HINDI_CHUNK_RE) || []) {
    const lat = devanagariToLatin(chunk);
    if (lat) parts.push(lat);
  }
  for (const word of text.match(OCR_WORD_RE) || []) {
    if (word.length <= 40) parts.push(word.toLowerCase());
  }
  for (const num of text.match(OCR_LONG_NUMBER_RE) || []) {
    parts.push(num);
  }
  return normalizeRomanForSearch(parts.join(" ")).slice(0, LATIN_MAX);
}

export function buildOcrEntry(rawText, options = {}) {
  const text = cleanOcrTextMultiline(String(rawText || ""));
  if (!text) return null;
  if (!options.allowLowQuality && !isWorthStoringOcr(text.replace(/\n/g, " "))) return null;
  const latin = buildLatinForSearch(text.replace(/\n/g, " "));
  return latin ? { text, latin } : { text };
}

export function normalizeOcrEntry(value) {
  if (typeof value === "string" && value.trim()) {
    return buildOcrEntry(value) || { text: value.trim() };
  }
  if (value && typeof value === "object" && typeof value.text === "string" && value.text.trim()) {
    return buildOcrEntry(value.text, { allowLowQuality: true });
  }
  return null;
}
