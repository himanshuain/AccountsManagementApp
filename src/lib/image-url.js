/**
 * Dynamic Image URL Resolution
 *
 * This module handles converting storage keys to full CDN URLs.
 *
 * Storage Strategy:
 * - Database stores: storage_key (e.g., "suppliers/1703520000000-abc123.jpg")
 * - At runtime: resolve to ImageKit CDN URL for serving
 *
 * ImageKit is configured to pull from R2 as origin:
 * - ImageKit URL Endpoint -> R2 bucket (via Cloudflare public URL or custom domain)
 *
 * This approach provides:
 * - Flexibility to change CDN providers without data migration
 * - Consistent storage format
 * - Easy backup/restore (just storage keys, not full URLs)
 */

// ImageKit URL endpoint (the CDN endpoint that serves from R2)
const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";

/**
 * Check if ImageKit CDN is configured
 */
export function isCdnConfigured() {
  return !!IMAGEKIT_URL_ENDPOINT;
}

/**
 * Check if a value is a storage key (not a full URL)
 * Storage keys don't start with http:// or https:// or data:
 * @param {string} value - The value to check
 * @returns {boolean}
 */
export function isStorageKey(value) {
  if (!value || typeof value !== "string") return false;
  return !value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("data:");
}

/**
 * Check if a value is a legacy ImageKit URL
 * @param {string} value - The value to check
 * @returns {boolean}
 */
export function isImageKitUrl(value) {
  if (!value || typeof value !== "string") return false;
  return value.includes("ik.imagekit.io");
}

/**
 * Check if a value is a data URL (base64)
 * @param {string} value - The value to check
 * @returns {boolean}
 */
export function isDataUrl(value) {
  if (!value || typeof value !== "string") return false;
  return value.startsWith("data:");
}

/**
 * Extract storage key from a legacy ImageKit URL
 * Used for backwards compatibility during migration
 *
 * @param {string} url - The ImageKit URL
 * @returns {string|null} The storage key or null
 */
export function extractStorageKeyFromUrl(url) {
  if (!url || !isImageKitUrl(url)) return null;

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) return null;

    // First part is the imagekit ID
    // If second part starts with "tr:", it's a transform, skip it
    let startIndex = 1;
    if (pathParts[1]?.startsWith("tr:")) {
      startIndex = 2;
    }

    // Rest is the file path (storage key)
    return pathParts.slice(startIndex).join("/");
  } catch (e) {
    console.error("[ImageURL] Error extracting storage key:", e);
    return null;
  }
}

/**
 * Resolve a storage key or URL to a full CDN URL
 * Handles:
 * - Storage keys (new format) -> ImageKit URL
 * - Legacy ImageKit URLs -> Pass through (with optional transformation)
 * - Data URLs -> Pass through as-is
 * - Other URLs -> Pass through as-is
 *
 * @param {string} value - Storage key or URL
 * @returns {string} Full CDN URL or original value
 */
export function resolveImageUrl(value) {
  if (!value || typeof value !== "string") return "";

  // Data URLs - return as-is
  if (isDataUrl(value)) {
    return value;
  }

  // Already a full URL (legacy or other) - return as-is
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  // Storage key - resolve to ImageKit URL
  if (isCdnConfigured()) {
    // Remove leading slash if present
    const cleanKey = value.startsWith("/") ? value.slice(1) : value;
    return `${IMAGEKIT_URL_ENDPOINT}/${cleanKey}`;
  }

  // No CDN configured - return as-is (won't display, but won't break)
  return value;
}

/**
 * Build ImageKit transformation URL
 * Works with both storage keys and full URLs
 *
 * @param {string} value - Storage key or ImageKit URL
 * @param {string} transformString - Transformation string (e.g., "w-300,h-300,q-80")
 * @returns {string} Transformed URL
 */
export function buildTransformUrl(value, transformString) {
  if (!value || !transformString) return resolveImageUrl(value);

  // Resolve to full URL first
  const fullUrl = resolveImageUrl(value);

  // Data URLs can't be transformed
  if (isDataUrl(fullUrl)) {
    return fullUrl;
  }

  // Only transform ImageKit URLs
  if (!fullUrl.includes("ik.imagekit.io")) {
    return fullUrl;
  }

  try {
    const url = new URL(fullUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) return fullUrl;

    // First part is the imagekit ID
    const imagekitId = pathParts[0];

    // Check if there's already a transform
    let filePath;
    if (pathParts[1]?.startsWith("tr:")) {
      // Already has transform - replace it
      filePath = pathParts.slice(2).join("/");
    } else {
      // No transform yet
      filePath = pathParts.slice(1).join("/");
    }

    // Build new URL with transformation
    url.pathname = `/${imagekitId}/tr:${transformString}/${filePath}`;

    return url.toString();
  } catch (e) {
    console.error("[ImageURL] Error building transform URL:", e);
    return fullUrl;
  }
}

/**
 * Get optimized image URLs with various transformations
 * Main entry point for components
 *
 * @param {string} value - Storage key or URL
 * @param {Object} options - Transformation options
 * @returns {Object} Object containing various optimized URLs
 */
export function getImageUrls(value, options = {}) {
  const emptyResult = { src: "", lqip: "", thumbnail: "", medium: "", original: "" };

  if (!value || typeof value !== "string") {
    return emptyResult;
  }

  // Data URLs - return as-is for all variants
  if (isDataUrl(value)) {
    return {
      src: value,
      lqip: value,
      thumbnail: value,
      medium: value,
      original: value,
    };
  }

  // Resolve to full URL
  const originalUrl = resolveImageUrl(value);

  // If not an ImageKit URL, return original for all variants
  if (!originalUrl.includes("ik.imagekit.io")) {
    return {
      src: originalUrl,
      lqip: originalUrl,
      thumbnail: originalUrl,
      medium: originalUrl,
      original: originalUrl,
    };
  }

  const { width, height, quality = 80, blur } = options;

  // Build main transformation string
  const transforms = [];
  if (width) transforms.push(`w-${width}`);
  if (height) transforms.push(`h-${height}`);
  if (quality) transforms.push(`q-${quality}`);
  if (blur) transforms.push(`bl-${blur}`);
  transforms.push("f-auto"); // Auto format (WebP/AVIF)
  transforms.push("pr-true"); // Progressive loading

  const mainTransform = transforms.join(",");

  // LQIP: Very small, heavily blurred placeholder
  const lqipTransform = "w-40,q-20,bl-30,f-auto";

  // Thumbnail: Small, optimized for grids/lists
  const thumbnailTransform = "w-200,h-200,q-60,c-at_max,f-auto";

  // Medium: For previews in forms
  const mediumTransform = "w-400,q-70,f-auto,pr-true";

  return {
    src: buildTransformUrl(value, mainTransform),
    lqip: buildTransformUrl(value, lqipTransform),
    thumbnail: buildTransformUrl(value, thumbnailTransform),
    medium: buildTransformUrl(value, mediumTransform),
    original: originalUrl,
  };
}

/**
 * Generate srcset for responsive images
 * @param {string} value - Storage key or URL
 * @param {number[]} widths - Array of widths for srcset
 * @returns {string} srcset string
 */
export function generateSrcSet(value, widths = [320, 640, 768, 1024, 1280]) {
  const fullUrl = resolveImageUrl(value);

  if (!fullUrl || !fullUrl.includes("ik.imagekit.io")) return "";

  return widths
    .map(w => {
      const transform = `w-${w},q-75,f-auto`;
      return `${buildTransformUrl(value, transform)} ${w}w`;
    })
    .join(", ");
}

/**
 * Normalize a value to storage key format
 * - If it's already a storage key, return as-is
 * - If it's a legacy ImageKit URL, extract the storage key
 * - If it's a data URL or other URL, return as-is (can't normalize)
 *
 * @param {string} value - The value to normalize
 * @returns {string} Storage key or original value
 */
export function normalizeToStorageKey(value) {
  if (!value || typeof value !== "string") return value;

  // Already a storage key
  if (isStorageKey(value)) {
    return value;
  }

  // Legacy ImageKit URL - extract storage key
  if (isImageKitUrl(value)) {
    const extracted = extractStorageKeyFromUrl(value);
    return extracted || value;
  }

  // Data URL or other - can't normalize, return as-is
  return value;
}

/**
 * Process an array of image values, normalizing and resolving each
 * @param {string[]} values - Array of storage keys or URLs
 * @returns {Object[]} Array of {storageKey, url} objects
 */
export function processImageArray(values) {
  if (!Array.isArray(values)) return [];

  return values
    .filter(v => v && typeof v === "string")
    .map(value => ({
      storageKey: normalizeToStorageKey(value),
      url: resolveImageUrl(value),
      urls: getImageUrls(value),
    }));
}

export default {
  isCdnConfigured,
  isStorageKey,
  isImageKitUrl,
  isDataUrl,
  extractStorageKeyFromUrl,
  resolveImageUrl,
  buildTransformUrl,
  getImageUrls,
  generateSrcSet,
  normalizeToStorageKey,
  processImageArray,
};

