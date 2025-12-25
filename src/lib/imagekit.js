/**
 * ImageKit CDN Integration
 *
 * This module provides image optimization via ImageKit CDN.
 * Images are stored in Cloudflare R2 and served through ImageKit.
 *
 * Storage Strategy:
 * - Database stores: storage_key (e.g., "suppliers/123.jpg")
 * - At display time: resolve to ImageKit CDN URL
 *
 * This module re-exports from image-url.js for backwards compatibility.
 */

import {
  isCdnConfigured,
  isStorageKey,
  isImageKitUrl,
  isDataUrl,
  resolveImageUrl,
  buildTransformUrl,
  getImageUrls,
  generateSrcSet,
  normalizeToStorageKey,
} from "./image-url";

// Re-export URL resolution functions
export {
  isCdnConfigured,
  isStorageKey,
  isImageKitUrl,
  isDataUrl,
  resolveImageUrl,
  buildTransformUrl,
  getImageUrls,
  generateSrcSet,
  normalizeToStorageKey,
};

// ImageKit configuration
const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "";
const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "";

/**
 * Check if ImageKit is properly configured
 * @deprecated Use isCdnConfigured() instead
 */
export function isImageKitConfigured() {
  return isCdnConfigured();
}

/**
 * Get the ImageKit URL endpoint
 */
export function getImageKitUrlEndpoint() {
  return IMAGEKIT_URL_ENDPOINT;
}

/**
 * Get optimized image URL with ImageKit transformations
 * Handles both storage keys (new) and full URLs (legacy)
 *
 * @param {string} value - Storage key or full URL
 * @param {Object} options - Transformation options
 * @returns {Object} Object containing src, lqip, thumbnail, medium, original URLs
 */
export function getOptimizedImageUrl(value, options = {}) {
  return getImageUrls(value, options);
}

/**
 * Get a specific transformation URL
 * @param {string} value - Storage key or ImageKit URL
 * @param {Object} options - Transformation options
 * @returns {string} Transformed URL
 */
export function getTransformedUrl(value, options = {}) {
  if (!value) return "";

  const fullUrl = resolveImageUrl(value);

  // Data URLs can't be transformed
  if (isDataUrl(fullUrl)) return fullUrl;

  // Only transform ImageKit URLs
  if (!fullUrl.includes("ik.imagekit.io")) return fullUrl;

  const transforms = [];
  if (options.width) transforms.push(`w-${options.width}`);
  if (options.height) transforms.push(`h-${options.height}`);
  if (options.quality) transforms.push(`q-${options.quality}`);
  if (options.blur) transforms.push(`bl-${options.blur}`);
  if (options.crop) transforms.push(`c-${options.crop}`);
  if (options.format !== false) transforms.push("f-auto");
  if (options.progressive !== false) transforms.push("pr-true");

  return buildTransformUrl(value, transforms.join(","));
}

/**
 * Upload image to storage (via API route)
 * @param {File|Blob} file - The file to upload
 * @param {string} folder - The folder to upload to
 * @param {string} fileName - Optional custom file name (ignored, auto-generated)
 * @returns {Promise<Object>} Upload response with storageKey
 */
export async function uploadToImageKit(file, folder = "general", fileName = null) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Upload failed");
  }

  const result = await response.json();

  // Return storage key and resolved URL for backwards compatibility
  return {
    storageKey: result.storageKey,
    url: resolveImageUrl(result.storageKey),
  };
}

/**
 * Get ImageKit upload authentication parameters
 * @deprecated Not needed for R2 uploads (handled server-side)
 */
export async function getUploadAuthParams() {
  const response = await fetch("/api/imagekit/auth");
  if (!response.ok) {
    throw new Error("Failed to get upload authentication");
  }
  return response.json();
}

/**
 * Delete image from storage
 * @deprecated Use server-side deletion via API routes
 * @param {string} fileId - The file ID to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFromImageKit(fileId) {
  console.warn("[ImageKit] deleteFromImageKit is deprecated. Use server-side deletion.");
  return false;
}

const imageKitUtils = {
  isImageKitConfigured,
  isCdnConfigured,
  getImageKitUrlEndpoint,
  getOptimizedImageUrl,
  getTransformedUrl,
  generateSrcSet,
  uploadToImageKit,
  deleteFromImageKit,
  resolveImageUrl,
  normalizeToStorageKey,
};

export default imageKitUtils;
