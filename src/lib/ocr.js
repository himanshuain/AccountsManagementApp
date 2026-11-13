/**
 * Server-side OCR via Tesseract.js (Node runtime only).
 */

import { OCR_UPLOAD_FOLDERS } from "@/lib/image-ocr-map";
import { cleanOcrTextMultiline, isWorthStoringOcr } from "@/lib/ocr-quality";
import { preprocessImageForOcr } from "@/lib/ocr-preprocess";

const MAX_OCR_BYTES = 8 * 1024 * 1024;
const OCR_SKIP_MIME = new Set(["image/heic", "image/heif", "image/gif"]);
const LINE_CONF_MIN = 48;

let workerPromise = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("eng+hin");
    })();
  }
  return workerPromise;
}

/**
 * @param {Buffer|ArrayBuffer|Uint8Array} imageData
 * @param {{ mimeType?: string }} [options]
 * @returns {Promise<string>}
 */
export async function extractTextFromImage(imageData, options = {}) {
  const mime = (options.mimeType || "").toLowerCase();
  if (OCR_SKIP_MIME.has(mime)) {
    return "";
  }

  let buffer;
  if (Buffer.isBuffer(imageData)) {
    buffer = imageData;
  } else if (imageData instanceof ArrayBuffer) {
    buffer = Buffer.from(imageData);
  } else if (imageData instanceof Uint8Array) {
    buffer = Buffer.from(imageData);
  } else {
    return "";
  }

  if (buffer.length === 0 || buffer.length > MAX_OCR_BYTES) {
    return "";
  }

  try {
    const worker = await getOcrWorker();
    const { PSM } = await import("tesseract.js");
    const prepared = await preprocessImageForOcr(buffer);

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: "1",
    });

    const { data } = await worker.recognize(prepared);

    let text = "";
    if (Array.isArray(data?.lines) && data.lines.length) {
      text = data.lines
        .filter((line) => (line.confidence ?? 0) >= LINE_CONF_MIN)
        .map((line) => line.text)
        .join("\n");
    }
    if (!text.trim()) {
      text = data?.text || "";
    }

    text = cleanOcrTextMultiline(text);
    if (!isWorthStoringOcr(text)) {
      return "";
    }
    return text;
  } catch (err) {
    console.error("[OCR] Recognition failed:", err?.message || err);
    return "";
  }
}

export function shouldRunOcrForFolder(folder) {
  const normalized = String(folder || "general")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  return OCR_UPLOAD_FOLDERS.has(normalized);
}
