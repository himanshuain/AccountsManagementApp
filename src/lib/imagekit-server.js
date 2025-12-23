/**
 * Server-side ImageKit utilities for image deletion
 * This module handles deleting images from ImageKit storage
 */

/**
 * Check if ImageKit is configured for server-side operations
 */
function isImageKitConfigured() {
  return !!process.env.IMAGEKIT_PRIVATE_KEY;
}

/**
 * Extract file path from ImageKit URL
 * ImageKit URL format: https://ik.imagekit.io/{imagekit_id}/{folder}/{filename}
 * or with transforms: https://ik.imagekit.io/{imagekit_id}/tr:{transforms}/{folder}/{filename}
 *
 * @param {string} url - The ImageKit URL
 * @returns {string|null} The file path (e.g., "/folder/filename.jpg") or null
 */
function extractFilePathFromUrl(url) {
  if (!url || typeof url !== "string") return null;

  try {
    const urlObj = new URL(url);

    // Check if it's an ImageKit URL
    if (!urlObj.hostname.includes("imagekit.io")) {
      return null;
    }

    // Get path parts: [imagekit_id, ...rest]
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2) return null;

    // First part is the imagekit ID
    // If second part starts with "tr:", it's a transform, skip it
    let startIndex = 1;
    if (pathParts[1]?.startsWith("tr:")) {
      startIndex = 2;
    }

    // Rest is the file path
    const filePath = "/" + pathParts.slice(startIndex).join("/");
    return filePath;
  } catch (e) {
    console.error("[ImageKit] Error extracting file path:", e);
    return null;
  }
}

/**
 * Search for a file in ImageKit by its path and get its fileId
 *
 * @param {string} filePath - The file path (e.g., "/suppliers/image.jpg")
 * @param {string} authString - Base64 encoded auth string
 * @returns {Promise<string|null>} The fileId or null if not found
 */
async function getFileIdByPath(filePath, authString) {
  try {
    // Extract just the filename for search
    const fileName = filePath.split("/").pop();

    // Search by name
    const searchUrl = `https://api.imagekit.io/v1/files?name=${encodeURIComponent(fileName)}`;

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });

    if (!response.ok) {
      console.error("[ImageKit] Search failed:", response.status);
      return null;
    }

    const files = await response.json();

    // Find the file that matches our path
    const matchingFile = files.find(f => f.filePath === filePath);

    return matchingFile?.fileId || null;
  } catch (error) {
    console.error("[ImageKit] Error searching for file:", error);
    return null;
  }
}

/**
 * Delete a single file from ImageKit by fileId
 *
 * @param {string} fileId - The ImageKit file ID
 * @param {string} authString - Base64 encoded auth string
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteFileById(fileId, authString) {
  try {
    const response = await fetch(`https://api.imagekit.io/v1/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });

    if (response.ok) {
      console.log("[ImageKit] Deleted file:", fileId);
      return true;
    } else {
      console.error("[ImageKit] Delete failed:", response.status);
      return false;
    }
  } catch (error) {
    console.error("[ImageKit] Error deleting file:", error);
    return false;
  }
}

/**
 * Delete multiple images from ImageKit by their URLs
 * This is a best-effort operation - failures are logged but don't throw
 *
 * @param {string[]} imageUrls - Array of ImageKit URLs to delete
 * @returns {Promise<{deleted: number, failed: number}>} Count of deleted and failed files
 */
export async function deleteImagesFromImageKit(imageUrls) {
  const result = { deleted: 0, failed: 0 };

  // Skip if ImageKit is not configured
  if (!isImageKitConfigured()) {
    console.log("[ImageKit] Not configured, skipping image deletion");
    return result;
  }

  // Filter out null/undefined/empty values and non-ImageKit URLs
  const validUrls = (imageUrls || []).filter(
    url => url && typeof url === "string" && url.includes("ik.imagekit.io")
  );

  if (validUrls.length === 0) {
    return result;
  }

  console.log(`[ImageKit] Attempting to delete ${validUrls.length} images`);

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const authString = Buffer.from(`${privateKey}:`).toString("base64");

  // Process deletions
  for (const url of validUrls) {
    try {
      const filePath = extractFilePathFromUrl(url);

      if (!filePath) {
        console.log("[ImageKit] Could not extract path from URL:", url);
        result.failed++;
        continue;
      }

      const fileId = await getFileIdByPath(filePath, authString);

      if (!fileId) {
        console.log("[ImageKit] File not found in ImageKit:", filePath);
        result.failed++;
        continue;
      }

      const deleted = await deleteFileById(fileId, authString);

      if (deleted) {
        result.deleted++;
      } else {
        result.failed++;
      }
    } catch (error) {
      console.error("[ImageKit] Error processing URL:", url, error);
      result.failed++;
    }
  }

  console.log(`[ImageKit] Deletion complete: ${result.deleted} deleted, ${result.failed} failed`);
  return result;
}

/**
 * Collect all image URLs from a transaction record
 * Includes billImages and payment receiptUrls
 *
 * @param {Object} transaction - Transaction record
 * @returns {string[]} Array of image URLs
 */
export function collectTransactionImages(transaction) {
  const images = [];

  if (!transaction) return images;

  // Add bill images
  if (transaction.billImages && Array.isArray(transaction.billImages)) {
    images.push(...transaction.billImages);
  }
  // Handle snake_case version
  if (transaction.bill_images && Array.isArray(transaction.bill_images)) {
    images.push(...transaction.bill_images);
  }

  // Add receipt URLs from payments
  if (transaction.payments && Array.isArray(transaction.payments)) {
    transaction.payments.forEach(payment => {
      if (payment.receiptUrl) {
        images.push(payment.receiptUrl);
      }
    });
  }

  return images;
}

/**
 * Collect all image URLs from a udhar record
 * Includes khataPhotos and payment receiptUrls
 *
 * @param {Object} udhar - Udhar record
 * @returns {string[]} Array of image URLs
 */
export function collectUdharImages(udhar) {
  const images = [];

  if (!udhar) return images;

  // Add khata photos
  if (udhar.khataPhotos && Array.isArray(udhar.khataPhotos)) {
    images.push(...udhar.khataPhotos);
  }
  // Handle snake_case version
  if (udhar.khata_photos && Array.isArray(udhar.khata_photos)) {
    images.push(...udhar.khata_photos);
  }

  // Add bill image (single)
  if (udhar.billImage) {
    images.push(udhar.billImage);
  }
  if (udhar.bill_image) {
    images.push(udhar.bill_image);
  }

  // Add receipt URLs from payments
  if (udhar.payments && Array.isArray(udhar.payments)) {
    udhar.payments.forEach(payment => {
      if (payment.receiptUrl) {
        images.push(payment.receiptUrl);
      }
    });
  }

  return images;
}

/**
 * Collect all image URLs from a supplier record
 *
 * @param {Object} supplier - Supplier record
 * @returns {string[]} Array of image URLs
 */
export function collectSupplierImages(supplier) {
  const images = [];

  if (!supplier) return images;

  // Add profile picture
  if (supplier.profilePicture) {
    images.push(supplier.profilePicture);
  }
  // Handle snake_case version
  if (supplier.profile_picture) {
    images.push(supplier.profile_picture);
  }

  // Add logo if exists
  if (supplier.logo) {
    images.push(supplier.logo);
  }

  // Add photos array if exists
  if (supplier.photos && Array.isArray(supplier.photos)) {
    images.push(...supplier.photos);
  }

  return images;
}

/**
 * Collect all image URLs from a customer record
 *
 * @param {Object} customer - Customer record
 * @returns {string[]} Array of image URLs
 */
export function collectCustomerImages(customer) {
  const images = [];

  if (!customer) return images;

  // Add profile picture
  if (customer.profilePicture) {
    images.push(customer.profilePicture);
  }
  // Handle snake_case version
  if (customer.profile_picture) {
    images.push(customer.profile_picture);
  }

  // Add khata photo (single)
  if (customer.khataPhoto) {
    images.push(customer.khataPhoto);
  }
  if (customer.khata_photo) {
    images.push(customer.khata_photo);
  }

  // Add khata photos array
  if (customer.khataPhotos && Array.isArray(customer.khataPhotos)) {
    images.push(...customer.khataPhotos);
  }
  if (customer.khata_photos && Array.isArray(customer.khata_photos)) {
    images.push(...customer.khata_photos);
  }

  return images;
}

export default {
  deleteImagesFromImageKit,
  collectTransactionImages,
  collectUdharImages,
  collectSupplierImages,
  collectCustomerImages,
};
