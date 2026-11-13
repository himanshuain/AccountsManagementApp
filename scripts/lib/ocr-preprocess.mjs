/** CLI mirror of src/lib/ocr-preprocess.js */

import sharp from "sharp";

const MIN_OCR_WIDTH = 1800;
const MAX_OCR_PIXELS = 12_000_000;

export async function preprocessImageForOcr(buffer) {
  if (!buffer?.length) return buffer;
  let pipeline = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (width > 0 && width < MIN_OCR_WIDTH) {
    const scale = MIN_OCR_WIDTH / width;
    const targetH = Math.round(height * scale);
    if (MIN_OCR_WIDTH * targetH <= MAX_OCR_PIXELS) {
      pipeline = pipeline.resize({ width: MIN_OCR_WIDTH, height: targetH, fit: "inside" });
    }
  }
  return pipeline.grayscale().normalize().sharpen({ sigma: 0.8 }).jpeg({ quality: 94 }).toBuffer();
}
