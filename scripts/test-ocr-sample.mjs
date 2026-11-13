/**
 * Quick local OCR check: node scripts/test-ocr-sample.mjs <image-path>
 */
import fs from "fs";
import { createWorker, PSM } from "tesseract.js";
import { buildOcrEntry } from "./lib/ocr-entry.mjs";
import { cleanOcrTextMultiline, isWorthStoringOcr } from "./lib/ocr-quality.mjs";
import { preprocessImageForOcr } from "./lib/ocr-preprocess.mjs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node scripts/test-ocr-sample.mjs <image>");
  process.exit(1);
}

const buffer = fs.readFileSync(path);
const worker = await createWorker("eng+hin");
const prepared = await preprocessImageForOcr(buffer);
await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, preserve_interword_spaces: "1" });
const { data } = await worker.recognize(prepared);
let text = "";
if (Array.isArray(data?.lines)) {
  text = data.lines
    .filter((l) => (l.confidence ?? 0) >= 48)
    .map((l) => l.text)
    .join("\n");
}
if (!text.trim()) text = data.text || "";
text = cleanOcrTextMultiline(text);
console.log("worth storing:", isWorthStoringOcr(text.replace(/\n/g, " ")));
console.log("--- text ---\n", text.slice(0, 2000));
const entry = buildOcrEntry(text);
console.log("--- latin ---\n", entry?.latin);
await worker.terminate();
