/**
 * Application-wide constants
 * Centralized location for easy configuration
 */

// ======================
// PAGINATION SETTINGS
// ======================

/**
 * Number of records to fetch per page from APIs
 * Adjust these values to balance between:
 * - Lower values = Less bandwidth per request, more requests
 * - Higher values = Fewer requests, more data per request
 */
export const PAGE_SIZE = {
  SUPPLIERS: 5,      // Vyapari records per page
  CUSTOMERS: 5,      // Customer records per page
  TRANSACTIONS: 5,   // Transaction records per page
  UDHAR: 5,          // Udhar records per page
};

// ======================
// UI PROGRESSIVE LOADING
// ======================

/**
 * Number of items to show initially in progressive lists
 * and how many more to load on scroll
 */
export const PROGRESSIVE_LOAD = {
  BILL_GALLERY_INITIAL: 8,   // Initial bills shown in gallery
  BILL_GALLERY_BATCH: 8,     // Bills to load per scroll
};

// ======================
// IMAGE SETTINGS
// ======================

/**
 * ImageKit image optimization settings
 */
export const IMAGE_SETTINGS = {
  THUMBNAIL_SIZE: 200,        // Thumbnail dimension (px)
  THUMBNAIL_QUALITY: 60,      // Thumbnail quality (%)
  MEDIUM_WIDTH: 400,          // Medium image width (px)
  MEDIUM_QUALITY: 70,         // Medium image quality (%)
  FULL_QUALITY: 80,           // Full image quality (%)
  LQIP_WIDTH: 40,             // Low quality placeholder width (px)
  LQIP_QUALITY: 20,           // LQIP quality (%)
  LQIP_BLUR: 30,              // LQIP blur amount
};

// ======================
// CACHE SETTINGS
// ======================

/**
 * React Query cache settings (in milliseconds)
 */
export const CACHE_SETTINGS = {
  STALE_TIME: 1000 * 60 * 2,  // 2 minutes - consider data fresh
  RETRY_COUNT: 2,             // Number of retries on failure
};

const optimizedSettings = {
    PAGE_SIZE,
    PROGRESSIVE_LOAD,
    IMAGE_SETTINGS,
    CACHE_SETTINGS,
  };

export default optimizedSettings;

