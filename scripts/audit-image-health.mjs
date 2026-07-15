/**
 * Audit bill image health: DB refs vs R2 objects + cleanup false-positive analysis.
 * Run: NODE_TLS_REJECT_UNAUTHORIZED=0 node --env-file=.env.local scripts/audit-image-health.mjs
 * (TLS bypass only needed on networks with corporate VPN/proxy cert interception.)
 */
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "shop-images";
const IMAGEKIT_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";

function isStorageKey(v) {
  return (
    typeof v === "string" &&
    v.length > 0 &&
    !v.startsWith("http") &&
    !v.startsWith("data:")
  );
}

function extractKeyFromImageKitUrl(url) {
  if (!url?.includes("ik.imagekit.io")) return null;
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    let start = 1;
    if (parts[1]?.startsWith("tr:")) start = 2;
    return parts.slice(start).join("/") || null;
  } catch {
    return null;
  }
}

function normalizeRef(ref) {
  if (!ref || typeof ref !== "string") return null;
  if (isStorageKey(ref)) return ref;
  if (ref.includes("ik.imagekit.io")) return extractKeyFromImageKitUrl(ref);
  return null;
}

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

async function existsInR2(client, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
    return true;
  } catch (e) {
    if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) return false;
    throw e;
  }
}

async function listAllR2Keys(client) {
  const keys = [];
  let token;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );
    for (const obj of res.Contents || []) {
      if (obj.Key) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function fetchCdnStatus(key) {
  if (!IMAGEKIT_ENDPOINT) return { status: null, url: null };
  const url = `${IMAGEKIT_ENDPOINT.replace(/\/$/, "")}/${key}`;
  try {
    const res = await fetch(url, { method: "HEAD" });
    return { status: res.status, url };
  } catch (e) {
    return { status: "error", url, error: e.message };
  }
}

function daysAgo(dateStr) {
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function isR2KeyReferenced(r2Key, dbRefs) {
  if (dbRefs.has(r2Key)) return true;
  for (const ref of dbRefs) {
    if (normalizeRef(ref) === r2Key) return true;
  }
  return false;
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("Missing Supabase env. Run with: node --env-file=.env.local scripts/audit-image-health.mjs");
    process.exit(1);
  }

  const r2Ok = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
  console.log("\n=== Bill Image Health Audit ===\n");
  console.log(`R2 configured: ${r2Ok}`);
  console.log(`ImageKit endpoint: ${IMAGEKIT_ENDPOINT || "(not set)"}\n`);

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("id, date, created_at, updated_at, bill_images, payments")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase error:", error.message);
    process.exit(1);
  }

  const allRefs = [];
  const billEntries = [];

  for (const txn of transactions || []) {
    const images = Array.isArray(txn.bill_images) ? txn.bill_images : [];
    for (const ref of images) {
      if (!ref || typeof ref !== "string" || ref.startsWith("data:")) continue;
      const key = normalizeRef(ref);
      const entry = {
        transactionId: txn.id,
        date: txn.date,
        createdAt: txn.created_at,
        updatedAt: txn.updated_at,
        ageDays: daysAgo(txn.created_at),
        ref,
        storageKey: key,
        refType: isStorageKey(ref) ? "storage_key" : ref.includes("ik.imagekit.io") ? "imagekit_url" : "other_url",
      };
      billEntries.push(entry);
      allRefs.push(ref);
      if (key) allRefs.push(key);
    }
  }

  console.log(`Transactions: ${transactions?.length || 0}`);
  console.log(`Bill image refs in DB: ${billEntries.length}`);

  const byAge = { under30: 0, days30to60: 0, over60: 0 };
  for (const e of billEntries) {
    if (e.ageDays < 30) byAge.under30++;
    else if (e.ageDays < 60) byAge.days30to60++;
    else byAge.over60++;
  }
  console.log(`By age: <30d=${byAge.under30}, 30-60d=${byAge.days30to60}, >60d=${byAge.over60}`);
  console.log(`Ref types: storage_key=${billEntries.filter(e => e.refType === "storage_key").length}, imagekit_url=${billEntries.filter(e => e.refType === "imagekit_url").length}, other=${billEntries.filter(e => e.refType === "other_url").length}\n`);

  if (!r2Ok) {
    console.log("Skipping R2 checks — credentials missing.");
    return;
  }

  const client = getR2Client();
  const missing = [];
  const present = [];
  const noKey = [];

  for (const entry of billEntries) {
    if (!entry.storageKey) {
      noKey.push(entry);
      continue;
    }
    const exists = await existsInR2(client, entry.storageKey);
    if (exists) {
      present.push(entry);
    } else {
      const cdn = await fetchCdnStatus(entry.storageKey);
      missing.push({ ...entry, cdnStatus: cdn.status, cdnUrl: cdn.url });
    }
  }

  console.log("--- R2 existence (bill images) ---");
  console.log(`Present in R2: ${present.length}`);
  console.log(`Missing from R2 (DB still references): ${missing.length}`);
  console.log(`Unresolvable refs (no storage key): ${noKey.length}\n`);

  if (missing.length > 0) {
    const missingByAge = { under30: 0, days30to60: 0, over60: 0 };
    for (const m of missing) {
      if (m.ageDays < 30) missingByAge.under30++;
      else if (m.ageDays < 60) missingByAge.days30to60++;
      else missingByAge.over60++;
    }
    console.log(`Missing by age: <30d=${missingByAge.under30}, 30-60d=${missingByAge.days30to60}, >60d=${missingByAge.over60}`);
    console.log("\nSample missing (up to 15):");
    for (const m of missing.slice(0, 15)) {
      console.log(`  txn=${m.transactionId} age=${m.ageDays}d updated=${m.updatedAt?.slice(0, 10)} key=${m.storageKey} cdn=${m.cdnStatus}`);
    }
  }

  // Simulate partial-PUT bug: record.bill_images || [] treats omitted field as empty
  const txnsWithBills = (transactions || []).filter(t => Array.isArray(t.bill_images) && t.bill_images.length > 0);
  const txnsUpdatedAfterCreate = txnsWithBills.filter(
    t => t.updated_at && t.created_at && t.updated_at !== t.created_at
  );
  const txnsWithMissingBills = new Set(missing.map(m => m.transactionId));
  const editedThenBroken = txnsUpdatedAfterCreate.filter(t => txnsWithMissingBills.has(t.id));

  console.log("\n--- Partial PUT bug correlation ---");
  console.log(`Transactions with bill images: ${txnsWithBills.length}`);
  console.log(`...edited after create (updated_at != created_at): ${txnsUpdatedAfterCreate.length}`);
  console.log(`...edited AND have missing R2 files: ${editedThenBroken.length}`);
  if (editedThenBroken.length > 0) {
    console.log("Likely hit by payment/edit partial PUT deleting bill images from R2:");
    for (const t of editedThenBroken.slice(0, 10)) {
      const miss = missing.filter(m => m.transactionId === t.id).length;
      console.log(`  id=${t.id} bills=${t.bill_images?.length} missing=${miss} created=${t.created_at?.slice(0, 10)} updated=${t.updated_at?.slice(0, 10)}`);
    }
  }

  // Cleanup audit: R2 orphans vs DB
  console.log("\n--- Storage cleanup audit ---");
  const dbRefs = new Set(allRefs);
  for (const ref of [...dbRefs]) {
    const k = normalizeRef(ref);
    if (k) dbRefs.add(k);
  }

  const r2Keys = await listAllR2Keys(client);
  const billR2Keys = r2Keys.filter(k => k.startsWith("bills/"));
  const orphaned = r2Keys.filter(k => !isR2KeyReferenced(k, dbRefs));
  const orphanedBills = billR2Keys.filter(k => !isR2KeyReferenced(k, dbRefs));

  console.log(`Total R2 objects: ${r2Keys.length}`);
  console.log(`bills/ folder: ${billR2Keys.length}`);
  console.log(`Orphaned (in R2, not in DB): ${orphaned.length}`);
  console.log(`Orphaned bills/: ${orphanedBills.length}`);

  // DB refs pointing to missing R2 = opposite problem (files deleted, DB kept)
  const dbOrphans = missing.length;
  console.log(`\nDB refs with missing R2 file (broken images): ${dbOrphans}`);
  console.log(`R2 files with no DB ref (cleanup candidates): ${orphaned.length}`);

  if (dbOrphans > 0 && editedThenBroken.length > 0) {
    console.log("\n>>> ROOT CAUSE LIKELY: partial PUT updates (payments/edits) omit billImages,");
    console.log("    server compares against [] and deletes all bill images from R2 while DB keeps keys.");
  } else if (dbOrphans > 0) {
    console.log("\n>>> Missing files found but weak correlation with edits — also check storage cleanup runs.");
  } else {
    console.log("\n>>> All bill storage keys exist in R2. If UI still fails, check ImageKit bandwidth/origin.");
  }

  console.log("");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
