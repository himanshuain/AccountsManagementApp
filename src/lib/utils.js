import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Get dynamic text size class based on amount length
export function getAmountTextSize(amount, baseSize = "2xl") {
  const formatted = Math.abs(amount || 0).toLocaleString();
  const length = formatted.length;

  // Map base sizes to their smaller variants
  const sizeMap = {
    "3xl": { small: "xl", medium: "2xl", large: "3xl" },
    "2xl": { small: "base", medium: "lg", large: "2xl" },
    xl: { small: "sm", medium: "base", large: "xl" },
    lg: { small: "xs", medium: "sm", large: "lg" },
  };

  const sizes = sizeMap[baseSize] || sizeMap["2xl"];

  if (length > 10) return `text-${sizes.small}`;
  if (length > 7) return `text-${sizes.medium}`;
  return `text-${sizes.large}`;
}

// Format amount with dynamic sizing
export function formatAmount(amount) {
  return `₹${Math.abs(amount || 0).toLocaleString()}`;
}
