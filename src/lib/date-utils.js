import {
  format,
  subMonths,
  parseISO,
  isToday,
  isYesterday,
  differenceInCalendarDays,
  startOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";

/**
 * Parse date strings (YYYY-MM-DD or ISO) to Date
 */
export function parseFlexibleDate(value) {
  if (!value) return null;
  try {
    const iso = String(value).length === 10 ? `${value}T12:00:00` : value;
    return parseISO(iso);
  } catch {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}

/**
 * Short relative label: Today, Yesterday, 3 days ago, 2 weeks ago, etc.
 */
export function getRelativeDayLabel(dateInput) {
  const d = dateInput instanceof Date ? dateInput : parseFlexibleDate(dateInput);
  if (!d) return null;

  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";

  const days = differenceInCalendarDays(startOfDay(new Date()), startOfDay(d));
  if (days < 0) return null;
  if (days <= 6) return `${days} days ago`;
  if (days <= 13) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return null;
}

/**
 * Format date with optional relative suffix: "21 Apr 2026 · Today"
 */
export function formatDateWithRelative(dateValue, dateFormat = "dd MMM yyyy") {
  const d = parseFlexibleDate(dateValue);
  if (!d) return "";
  const formatted = format(d, dateFormat);
  const relative = getRelativeDayLabel(d);
  return relative ? `${formatted} · ${relative}` : formatted;
}

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
/**
 * All calendar dates in a month (YYYY-MM-DD), oldest first
 * @param {string} monthKey - Month in yyyy-MM format
 * @returns {string[]}
 */
export function getDaysInMonth(monthKey) {
  const start = startOfMonth(parseISO(`${monthKey}-01T12:00:00`));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end }).map(d => format(d, "yyyy-MM-dd"));
}

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
