/**
 * Server-side OCR via Tesseract.js (Node runtime only).
 */

import { OCR_UPLOAD_FOLDERS } from "@/lib/image-ocr-map";

const MAX_OCR_BYTES = 8 * 1024 * 1024;
const OCR_SKIP_MIME = new Set(["image/heic", "image/heif", "image/gif"]);

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
    const { data } = await worker.recognize(buffer);
    return (data?.text || "").replace(/\s+/g, " ").trim();
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
