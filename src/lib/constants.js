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
  SUPPLIERS: 20, // Vyapari records per page
  CUSTOMERS: 20, // Customer records per page
  TRANSACTIONS: 20, // Transaction records per page
  UDHAR: 20, // Udhar records per page
};

/**
 * Number of items to display per page in UI lists
 */
export const ITEMS_PER_PAGE = 20;

// ======================
// CHART & FILTER OPTIONS
// ======================

/**
 * Chart duration options for income/revenue charts
 */
export const CHART_DURATION_OPTIONS = [
  { value: "3months", label: "3M", months: 3 },
  { value: "6months", label: "6M", months: 6 },
  { value: "12months", label: "1Y", months: 12 },
];

/**
 * Income filter options for filtering income list
 */
export const INCOME_FILTER_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "monthly", label: "Month" },
  { value: "3months", label: "3 Months" },
  { value: "6months", label: "6 Months" },
  { value: "thisYear", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
];

/**
 * Sort options for people lists (suppliers/customers)
 */
export const SORT_OPTIONS = [
  { id: "amount", label: "Amount" },
  { id: "name", label: "Name" },
  { id: "recent", label: "Recent" },
];

/**
 * Filter options for people lists
 */
export const PEOPLE_FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "supplier", label: "Suppliers" },
  { id: "customer", label: "Customers" },
];

// ======================
// UI PROGRESSIVE LOADING
// ======================

/**
 * Number of items to show initially in progressive lists
 * and how many more to load on scroll
 */
export const PROGRESSIVE_LOAD = {
  BILL_GALLERY_INITIAL: 8, // Initial bills shown in gallery
  BILL_GALLERY_BATCH: 8, // Bills to load per scroll
};

// ======================
// IMAGE SETTINGS
// ======================

/**
 * ImageKit image optimization settings
 */
export const IMAGE_SETTINGS = {
  THUMBNAIL_SIZE: 200, // Thumbnail dimension (px)
  THUMBNAIL_QUALITY: 60, // Thumbnail quality (%)
  MEDIUM_WIDTH: 400, // Medium image width (px)
  MEDIUM_QUALITY: 70, // Medium image quality (%)
  FULL_QUALITY: 80, // Full image quality (%)
  LQIP_WIDTH: 40, // Low quality placeholder width (px)
  LQIP_QUALITY: 20, // LQIP quality (%)
  LQIP_BLUR: 30, // LQIP blur amount
};

// ======================
// CACHE SETTINGS
// ======================

/**
 * React Query cache settings (in milliseconds)
 */
export const CACHE_SETTINGS = {
  STALE_TIME: 1000 * 60 * 2, // 2 minutes - consider data fresh
  RETRY_COUNT: 2, // Number of retries on failure
};

const optimizedSettings = {
  PAGE_SIZE,
  PROGRESSIVE_LOAD,
  IMAGE_SETTINGS,
  CACHE_SETTINGS,
};

export default optimizedSettings;
