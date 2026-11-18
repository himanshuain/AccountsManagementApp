import { textMatchesIndicSearch } from "@/lib/text-search";

/**
 * Match a supplier transaction or customer udhar row against a search query.
 */
export function recordMatchesBillSearch(record, query) {
  if (!query?.trim()) return true;
  const q = query.toLowerCase().trim();

  const amount = (record?.amount ?? record?.cashAmount ?? "").toString();
  if (amount.includes(q)) return true;

  if (textMatchesIndicSearch(record?.itemName, query)) return true;

  const notes = record?.notes || record?.itemDescription || "";
  if (textMatchesIndicSearch(notes, query)) return true;

  const status = (record?.paymentStatus || "").toLowerCase();
  if (status.includes(q)) return true;

  return false;
}