import { format, subMonths } from "date-fns";

/**
 * Get today's date in local timezone (YYYY-MM-DD format)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Generate month options for the last 12 months
 * @returns {Array<{value: string, label: string}>} Array of month options
 */
export function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    options.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
    });
  }
  return options;
}

/**
 * Generate available months from a list of items with date field
 * @param {Array<{date: string}>} list - Array of items with date property
 * @returns {Array<{value: string, label: string}>} Array of month options sorted newest first
 */
export function getAvailableMonths(list) {
  const monthsSet = new Set();
  list.forEach(item => {
    const date = new Date(item.date);
    monthsSet.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  });

  // Convert to array and sort by year desc, then month desc
  return Array.from(monthsSet)
    .sort((a, b) => b.localeCompare(a))
    .map(monthKey => ({
      value: monthKey,
      label: format(new Date(monthKey + "-01"), "MMMM yyyy"),
    }));
}
