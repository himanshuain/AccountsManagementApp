/**
 * Server-side Image Storage Utilities
 *
 * This module handles server-side image operations:
 * - Deleting images from R2 storage
 * - Collecting image references from records
 *
 * Images are stored in Cloudflare R2 and served via ImageKit CDN.
 */

import { deleteMultipleFromR2, isR2Configured } from "./r2-storage";
import { normalizeToStorageKey, isStorageKey, isDataUrl } from "./image-url";

/**
 * Check if storage is configured for server-side operations
 */
export function isStorageConfigured() {
  return isR2Configured();
}

/**
 * Normalize a value to storage key, handling legacy URLs
 * @param {string} value - Storage key or legacy URL
 * @returns {string|null} Storage key or null if invalid
 */
function toStorageKey(value) {
  if (!value || typeof value !== "string") return null;

  // Skip data URLs
  if (isDataUrl(value)) return null;

  // Normalize to storage key (extracts from legacy URLs if needed)
  const key = normalizeToStorageKey(value);

  // If it's still a full URL (not ImageKit), we can't delete it
  if (key && (key.startsWith("http://") || key.startsWith("https://"))) {
    return null;
  }

  return key;
}

/**
 * Delete images from R2 storage
 * Accepts storage keys or legacy ImageKit URLs
 *
 * @param {string[]} imageValues - Array of storage keys or URLs
 * @returns {Promise<{deleted: number, failed: number}>}
 */
export async function deleteImagesFromStorage(imageValues) {
  const result = { deleted: 0, failed: 0 };

  if (!isR2Configured()) {
    console.log("[Storage] Not configured, skipping image deletion");
    return result;
  }

  // Convert to storage keys
  const storageKeys = (imageValues || [])
    .map(toStorageKey)
    .filter(key => key !== null);

  if (storageKeys.length === 0) {
    return result;
  }

  console.log(`[Storage] Deleting ${storageKeys.length} images from R2`);
  return deleteMultipleFromR2(storageKeys);
}

/**
 * @deprecated Use deleteImagesFromStorage instead
 * Kept for backwards compatibility
 */
export async function deleteImagesFromImageKit(imageUrls) {
  console.warn("[Storage] deleteImagesFromImageKit is deprecated, use deleteImagesFromStorage");
  return deleteImagesFromStorage(imageUrls);
}

// ==================== Record Image Collectors ====================
// These functions extract image references from database records
// They handle both storage keys and legacy full URLs

/**
 * Collect all image references from a transaction record
 * @param {Object} transaction - Transaction record
 * @returns {string[]} Array of storage keys/URLs
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
      // Handle storage key format
      if (payment.receiptKey) {
        images.push(payment.receiptKey);
      }
    });
  }

  return images.filter(Boolean);
}

/**
 * Collect all image references from an udhar record
 * @param {Object} udhar - Udhar record
 * @returns {string[]} Array of storage keys/URLs
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
      if (payment.receiptKey) {
        images.push(payment.receiptKey);
      }
    });
  }

  return images.filter(Boolean);
}

/**
 * Collect all image references from a supplier record
 * @param {Object} supplier - Supplier record
 * @returns {string[]} Array of storage keys/URLs
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

  // Add UPI QR code
  if (supplier.upiQrCode) {
    images.push(supplier.upiQrCode);
  }
  if (supplier.upi_qr_code) {
    images.push(supplier.upi_qr_code);
  }

  // Add photos array if exists
  if (supplier.photos && Array.isArray(supplier.photos)) {
    images.push(...supplier.photos);
  }

  return images.filter(Boolean);
}

/**
 * Collect all image references from a customer record
 * @param {Object} customer - Customer record
 * @returns {string[]} Array of storage keys/URLs
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

  return images.filter(Boolean);
}

export default {
  isStorageConfigured,
  deleteImagesFromStorage,
  deleteImagesFromImageKit, // deprecated alias
  collectTransactionImages,
  collectUdharImages,
  collectSupplierImages,
  collectCustomerImages,
};
