import Sanscript from "@indic-transliteration/sanscript";

const DEVANAGARI_RE = /[\u0900-\u097F]/;

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

function relaxRomanInputForItrans(query) {
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

function latinQueryToDevanagariVariants(query) {
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

/** Match notes/items: Hindi in data, English (or Hindi) in search box */
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