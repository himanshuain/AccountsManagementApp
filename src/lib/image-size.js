const sizeCache = new Map();

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

function getDataUrlSizeBytes(dataUrl) {
  const base64Index = dataUrl.indexOf(",");
  if (base64Index === -1) return null;
  const base64 = dataUrl.slice(base64Index + 1);
  const paddingMatch = base64.match(/=+$/);
  const padding = paddingMatch ? paddingMatch[0].length : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4 - padding));
}

export async function getImageSizeBytes(url, { allowDownload = false } = {}) {
  if (!url) return null;
  if (sizeCache.has(url)) return sizeCache.get(url);

  if (url.startsWith("data:")) {
    const bytes = getDataUrlSizeBytes(url);
    if (bytes !== null) sizeCache.set(url, bytes);
    return bytes;
  }

  try {
    const headResponse = await fetch(url, { method: "HEAD" });
    const lengthHeader = headResponse.headers.get("content-length");
    const length = lengthHeader ? Number(lengthHeader) : null;
    if (Number.isFinite(length) && length > 0) {
      sizeCache.set(url, length);
      return length;
    }
  } catch {
    // Ignore HEAD errors and optionally fall back to full download.
  }

  if (!allowDownload) return null;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const bytes = blob.size;
    if (Number.isFinite(bytes) && bytes > 0) {
      sizeCache.set(url, bytes);
      return bytes;
    }
  } catch {
    return null;
  }

  return null;
}
