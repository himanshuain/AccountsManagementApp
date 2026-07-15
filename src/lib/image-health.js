/**
 * Server-side bill image accessibility checks.
 * CDN is checked first (matches what the app displays); R2 is a fallback.
 */

import { existsInR2, isR2Configured } from "./r2-storage";
import {
  isStorageKey,
  normalizeToStorageKey,
  resolveImageUrl,
  isDataUrl,
} from "./image-url";
import resilientFetch from "./resilient-fetch";

const CHECK_TIMEOUT_MS = 10_000;

/**
 * @param {string} url
 * @returns {Promise<boolean|null>} true = loads, false = confirmed missing, null = inconclusive
 */
async function cdnUrlLoads(url) {
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return null;
  }

  const signal = AbortSignal.timeout(CHECK_TIMEOUT_MS);

  try {
    let res = await resilientFetch(url, { method: "HEAD", signal });
    if (res.ok) return true;
    if (res.status === 404) return false;
    if (res.status === 405) {
      res = await resilientFetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal,
      });
      if (res.ok || res.status === 206) return true;
      if (res.status === 404) return false;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * True when the image cannot be loaded (broken in the app).
 * @param {string} ref - storage key or URL from the database
 */
export async function isBillImageBroken(ref) {
  if (!ref || typeof ref !== "string" || isDataUrl(ref)) {
    return false;
  }

  const cdnUrl = resolveImageUrl(ref);
  const cdnResult = await cdnUrlLoads(cdnUrl);
  if (cdnResult === true) return false;
  if (cdnResult === false) return true;

  const key = normalizeToStorageKey(ref);
  if (isR2Configured() && isStorageKey(key)) {
    const inR2 = await existsInR2(key);
    return !inR2;
  }

  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    return cdnResult === false;
  }

  return false;
}
