/**
 * Cloudflare R2 Storage Client
 *
 * R2 is S3-compatible, so we use the AWS SDK S3 client.
 * Images are stored in R2 and served via ImageKit CDN.
 *
 * Storage key format: {folder}/{timestamp}-{random}.{ext}
 * Example: suppliers/1703520000000-abc123.jpg
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "shop-images";

/**
 * Check if R2 is properly configured
 */
export function isR2Configured() {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
}

/**
 * Get R2 client instance
 */
function getR2Client() {
  if (!isR2Configured()) {
    throw new Error("R2 is not configured. Check environment variables.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Generate a unique storage key for an image
 * @param {string} folder - The folder name (e.g., "suppliers", "transactions")
 * @param {string} originalFilename - Original filename for extension
 * @returns {string} Storage key (e.g., "suppliers/1703520000000-abc123.jpg")
 */
export function generateStorageKey(folder, originalFilename) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = originalFilename?.split(".").pop()?.toLowerCase() || "jpg";
  
  // Sanitize folder name
  const sanitizedFolder = folder.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9-_/]/g, "");
  
  return `${sanitizedFolder}/${timestamp}-${randomStr}.${extension}`;
}

/**
 * Upload an image to R2
 * @param {Buffer|Blob|ArrayBuffer} fileData - The file data to upload
 * @param {string} storageKey - The storage key (path) for the file
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{success: boolean, storageKey: string, error?: string}>}
 */
export async function uploadToR2(fileData, storageKey, contentType = "image/jpeg") {
  try {
    const client = getR2Client();
    
    // Convert to Buffer if needed
    let buffer;
    if (Buffer.isBuffer(fileData)) {
      buffer = fileData;
    } else if (fileData instanceof ArrayBuffer) {
      buffer = Buffer.from(fileData);
    } else if (fileData instanceof Blob) {
      const arrayBuffer = await fileData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error("Invalid file data type");
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable", // 1 year cache
    });

    await client.send(command);
    
    console.log(`[R2] Uploaded: ${storageKey}`);
    return { success: true, storageKey };
  } catch (error) {
    console.error("[R2] Upload error:", error);
    return { success: false, storageKey, error: error.message };
  }
}

/**
 * Delete an image from R2
 * @param {string} storageKey - The storage key to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFromR2(storageKey) {
  if (!storageKey) return false;
  
  try {
    const client = getR2Client();
    
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    });

    await client.send(command);
    console.log(`[R2] Deleted: ${storageKey}`);
    return true;
  } catch (error) {
    console.error("[R2] Delete error:", error);
    return false;
  }
}

/**
 * Delete multiple images from R2
 * @param {string[]} storageKeys - Array of storage keys to delete
 * @returns {Promise<{deleted: number, failed: number}>}
 */
export async function deleteMultipleFromR2(storageKeys) {
  const result = { deleted: 0, failed: 0 };
  
  if (!isR2Configured()) {
    console.log("[R2] Not configured, skipping deletion");
    return result;
  }

  const validKeys = (storageKeys || []).filter(key => key && typeof key === "string" && !key.startsWith("data:"));
  
  if (validKeys.length === 0) {
    return result;
  }

  console.log(`[R2] Attempting to delete ${validKeys.length} files`);

  for (const key of validKeys) {
    const deleted = await deleteFromR2(key);
    if (deleted) {
      result.deleted++;
    } else {
      result.failed++;
    }
  }

  console.log(`[R2] Deletion complete: ${result.deleted} deleted, ${result.failed} failed`);
  return result;
}

/**
 * Check if a file exists in R2
 * @param {string} storageKey - The storage key to check
 * @returns {Promise<boolean>}
 */
export async function existsInR2(storageKey) {
  if (!storageKey || !isR2Configured()) return false;
  
  try {
    const client = getR2Client();
    
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    });

    await client.send(command);
    return true;
  } catch (error) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    console.error("[R2] Exists check error:", error);
    return false;
  }
}

/**
 * Get storage statistics from R2
 * @returns {Promise<{success: boolean, data?: {used: number, fileCount: number, usedFormatted: string}, error?: string}>}
 */
export async function getR2StorageStats() {
  if (!isR2Configured()) {
    return { success: false, error: "R2 is not configured" };
  }

  try {
    const client = getR2Client();
    let totalSize = 0;
    let fileCount = 0;
    let continuationToken;

    // List all objects (handles pagination)
    do {
      const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await client.send(command);
      
      if (response.Contents) {
        for (const obj of response.Contents) {
          totalSize += obj.Size || 0;
          fileCount++;
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    // R2 Free tier: 10 GB storage, 10 million Class A operations, 1 million Class B operations
    const R2_FREE_TIER_STORAGE = 10 * 1024 * 1024 * 1024; // 10 GB
    const usedPercentage = (totalSize / R2_FREE_TIER_STORAGE) * 100;

    return {
      success: true,
      data: {
        used: totalSize,
        total: R2_FREE_TIER_STORAGE,
        usedFormatted: formatBytes(totalSize),
        totalFormatted: formatBytes(R2_FREE_TIER_STORAGE),
        usedPercentage: Math.round(usedPercentage * 100) / 100,
        fileCount,
        remaining: R2_FREE_TIER_STORAGE - totalSize,
        remainingFormatted: formatBytes(R2_FREE_TIER_STORAGE - totalSize),
      },
    };
  } catch (error) {
    console.error("[R2] Storage stats error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const r2Storage = {
  isR2Configured,
  generateStorageKey,
  uploadToR2,
  deleteFromR2,
  deleteMultipleFromR2,
  existsInR2,
  getR2StorageStats,
};

export default r2Storage;

