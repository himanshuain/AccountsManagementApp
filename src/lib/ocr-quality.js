/**
 * OCR text cleanup and quality checks (client + server safe).
 * CLI mirror: scripts/lib/ocr-quality.mjs
 */

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const NOISE_CHAR_RE = /[|£§~`'"<>{}[\]\\^_=©®™]/g;

/** Collapse whitespace; drop control chars and obvious noise runs */
function dedupeRepeatedOcrRuns(t) {
  const words = t.split(/\s+/);
  if (words.length < 50) return t;
  const mid = Math.floor(words.length / 2);
  const first = words.slice(0, mid).join(" ");
  const second = words.slice(mid).join(" ");
  if (first.length >= 80) {
    const probe = first.slice(0, Math.min(120, first.length));
    if (second.startsWith(probe)) return first;
  }
  return t;
}

export function cleanOcrText(raw) {
  let t = String(raw || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(NOISE_CHAR_RE, " ")
    .replace(/\s+/g, " ")
    .trim();

  t = dedupeRepeatedOcrRuns(t);

  if (t.length > 8000) {
    t = t.slice(0, 8000);
  }
  return t;
}

/** Multi-line variant for invoice table output */
export function cleanOcrTextMultiline(raw) {
  return String(raw || "")
    .split(/\r?\n/)
    .map(line =>
      line
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(NOISE_CHAR_RE, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(line => line.length > 0)
    .join("\n")
    .slice(0, 8000);
}

/**
 * @returns {number} 0–1 — low scores are mostly symbols / OCR garbage
 */
export function scoreOcrQuality(text) {
  const t = cleanOcrText(text);
  if (t.length < 10) return 0;

  const words = t.split(/\s+/).filter(w => w.length >= 2);
  if (words.length < 3) return 0;

  let good = 0;
  for (const w of words) {
    const alnum = (w.match(/[\p{L}\p{N}]/gu) || []).length;
    if (alnum >= Math.min(2, w.length) && alnum / w.length >= 0.45) good++;
  }

  const wordScore = good / words.length;
  const devRatio = (t.match(DEVANAGARI_RE) || []).length / t.length;
  const digitRatio = (t.match(/\d/g) || []).length / t.length;

  // Invoices: lots of digits + some real words is fine
  const blended = wordScore * 0.65 + Math.min(digitRatio * 2, 0.25) + Math.min(devRatio * 2, 0.1);
  return Math.min(1, Math.max(0, blended));
}

export function isWorthStoringOcr(text) {
  const t = cleanOcrText(text);
  if (t.length < 12) return false;
  return scoreOcrQuality(t) >= 0.32;
}
