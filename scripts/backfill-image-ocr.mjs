/**
 * Backfill Tesseract OCR (+ Hindi latin) for existing bill/khata images.
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-image-ocr.mjs
 *   node --env-file=.env.local scripts/backfill-image-ocr.mjs --force --limit=50
 *   node --env-file=.env.local scripts/backfill-image-ocr.mjs --table=transactions
 *
 * Only bill_images / khata_photos on live transactions & udhar (profile bills).
 * Skips: OCR already done, broken/orphan refs (not in R2 or ImageKit).
 *
 * On VPN: npm run backfill:ocr:vpn
 */
import { createClient } from "@supabase/supabase-js";
import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createWorker, PSM } from "tesseract.js";
import { cleanOcrTextMultiline, isWorthStoringOcr } from "./lib/ocr-quality.mjs";
import { preprocessImageForOcr } from "./lib/ocr-preprocess.mjs";
import { s3TlsRequestHandler, useInsecureTls } from "./lib/dev-tls.mjs";
import {
  buildOcrEntry,
  isOcrDone,
  flattenOcrMapForDb,
  normalizeImageRef,
  normalizeOcrMapRich,
  pruneOcrMap,
} from "./lib/ocr-text.mjs";

const PAGE_SIZE = 100;
const OCR_SKIP_EXT = new Set(["gif", "heic", "heif"]);

function parseArgs(argv) {
  const out = {
    dryRun: false,
    force: false,
    limit: 0,
    table: "all",
    verbose: false,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    if (arg === "--force") out.force = true;
    if (arg === "--verbose" || arg === "-v") out.verbose = true;
    if (arg.startsWith("--limit=")) out.limit = parseInt(arg.slice("--limit=".length), 10) || 0;
    if (arg.startsWith("--table=")) {
      const t = arg.slice("--table=".length);
      if (["all", "transactions", "udhar"].includes(t)) out.table = t;
    }
  }
  return out;
}

function isStorageKey(ref) {
  return (
    typeof ref === "string" &&
    ref.length > 0 &&
    !ref.startsWith("http") &&
    !ref.startsWith("data:")
  );
}

function collectImageRefs(arr) {
  return (arr || []).map(normalizeImageRef).filter(ref => ref && isStorageKey(ref));
}

function getR2Client() {
  const tlsHandler = s3TlsRequestHandler();
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    ...(tlsHandler ? { requestHandler: tlsHandler } : {}),
  });
}

async function getObjectBufferFromR2(client, key) {
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "shop-images",
        Key: key,
      })
    );
    const bytes = await res.Body?.transformToByteArray?.();
    if (!bytes?.length) return null;
    const ext = key.split(".").pop()?.toLowerCase() || "";
    return { buffer: Buffer.from(bytes), contentType: res.ContentType || "image/jpeg", ext, source: "r2" };
  } catch (e) {
    const missing =
      e.name === "NoSuchKey" ||
      e.Code === "NoSuchKey" ||
      e.$metadata?.httpStatusCode === 404 ||
      String(e.message || "").includes("does not exist");
    if (missing) return null;
    throw e;
  }
}

async function getObjectBufferFromCdn(key) {
  const base = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}/${key}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    if (!bytes.byteLength) return null;
    const ext = key.split(".").pop()?.toLowerCase() || "";
    return {
      buffer: Buffer.from(bytes),
      contentType: res.headers.get("content-type") || "image/jpeg",
      ext,
      source: "cdn",
    };
  } catch {
    return null;
  }
}

async function isImageReachable(client, key) {
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "shop-images",
        Key: key,
      })
    );
    return true;
  } catch {
    const base = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
    if (!base) return false;
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/${key}`, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  }
}

async function getImageBuffer(client, key) {
  const fromR2 = await getObjectBufferFromR2(client, key);
  if (fromR2) return fromR2;
  return getObjectBufferFromCdn(key);
}

let ocrWorker;

async function getOcrWorker() {
  if (!ocrWorker) {
    ocrWorker = await createWorker("eng+hin");
  }
  return ocrWorker;
}

const LINE_CONF_MIN = 48;

async function runOcr(buffer) {
  const worker = await getOcrWorker();
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
  if (!text.trim()) text = data?.text || "";
  text = cleanOcrTextMultiline(text);
  return isWorthStoringOcr(text) ? text : "";
}

async function ocrImageFromRef(client, ref) {
  const ext = ref.split(".").pop()?.toLowerCase() || "";
  if (OCR_SKIP_EXT.has(ext)) return { skip: "format" };
  const object = await getImageBuffer(client, ref);
  if (!object) return { skip: "missing" };
  const text = await runOcr(object.buffer);
  if (!text) return { skip: "empty" };
  return { entry: buildOcrEntry(text), source: object.source };
}

async function fetchAllRows(supabase, table, select) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function processTable({
  supabase,
  r2Client,
  table,
  imagesColumn,
  ocrColumn,
  opts,
  stats,
}) {
  console.log(`\n=== ${table} ===`);
  const rows = await fetchAllRows(supabase, table, `id, ${imagesColumn}, ${ocrColumn}`);

  for (const row of rows) {
    if (opts.limit > 0 && stats.imagesProcessed >= opts.limit) {
      console.log(`Limit ${opts.limit} images reached, stopping.`);
      return;
    }

    const refs = collectImageRefs(row[imagesColumn]);
    if (refs.length === 0) continue;

    const ocrMap = row[ocrColumn] && typeof row[ocrColumn] === "object" ? row[ocrColumn] : {};

    let changed = false;
    const nextRich = { ...normalizeOcrMapRich(ocrMap) };

    for (const ref of refs) {
      if (opts.limit > 0 && stats.imagesProcessed >= opts.limit) break;

      const existing = ocrMap[ref];

      if (!opts.force && isOcrDone(existing)) {
        stats.skippedHasOcr++;
        continue;
      }

      const reachable = await isImageReachable(r2Client, ref);
      if (!reachable) {
        stats.skippedUnreachable++;
        if (opts.verbose) {
          console.warn(`  skip orphan (not on R2/CDN): ${ref}`);
        }
        continue;
      }

      stats.imagesProcessed++;
      if (opts.verbose) {
        console.log(`  OCR ${table} ${row.id.slice(0, 8)}… → ${ref}`);
      }

      try {
        const result = await ocrImageFromRef(r2Client, ref);
        if (result.entry?.text) {
          nextRich[ref] = result.entry;
          changed = true;
          stats.ocrFilled++;
          if (result.source === "cdn") stats.ocrFromCdn++;
        } else if (result.skip === "missing") {
          stats.skippedUnreachable++;
        } else if (result.skip === "empty") {
          stats.ocrEmpty++;
        }
      } catch (e) {
        stats.ocrFailed++;
        console.warn(`    failed: ${ref}: ${e.message}`);
      }
    }

    if (!changed) continue;

    const persisted = pruneOcrMap(flattenOcrMapForDb(nextRich), refs);
    stats.rowsUpdated++;

    if (opts.dryRun) {
      console.log(`  [dry-run] would update ${row.id}`);
      continue;
    }

    const { error } = await supabase
      .from(table)
      .update({ [ocrColumn]: persisted, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (error) {
      stats.dbFailed++;
      console.error(`  DB update failed ${row.id}:`, error.message);
    }
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (useInsecureTls()) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.warn(
      "TLS verification disabled (DEV_INSECURE_TLS or NODE_TLS_REJECT_UNAUTHORIZED) for Supabase/R2/CDN."
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env. Use: node --env-file=.env.local scripts/backfill-image-ocr.mjs");
    process.exit(1);
  }

  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID) {
    console.error("Missing R2 env for OCR backfill.");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const r2Client = getR2Client();

  const stats = {
    imagesProcessed: 0,
    ocrFilled: 0,
    ocrFromCdn: 0,
    ocrEmpty: 0,
    ocrFailed: 0,
    skippedHasOcr: 0,
    skippedUnreachable: 0,
    rowsUpdated: 0,
    dbFailed: 0,
  };

  console.log(
    `Backfill OCR (profile bill/khata refs only) — dryRun=${opts.dryRun} force=${opts.force} limit=${opts.limit || "none"} table=${opts.table}`
  );

  if (opts.table === "all" || opts.table === "transactions") {
    await processTable({
      supabase,
      r2Client,
      table: "transactions",
      imagesColumn: "bill_images",
      ocrColumn: "bill_image_ocr",
      opts,
      stats,
    });
  }

  if (opts.table === "all" || opts.table === "udhar") {
    await processTable({
      supabase,
      r2Client,
      table: "udhar",
      imagesColumn: "khata_photos",
      ocrColumn: "khata_image_ocr",
      opts,
      stats,
    });
  }

  if (ocrWorker) {
    await ocrWorker.terminate();
  }

  console.log("\nDone:", stats);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
