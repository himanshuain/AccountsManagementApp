import { isWithinInterval, parseISO, subMonths } from "date-fns";

/** Paid amount on a supplier transaction (paidAmount field or sum of payments). */
export function getTransactionPaidAmount(transaction) {
  if (!transaction) return 0;
  const fromField = Number(transaction.paidAmount);
  if (fromField > 0) return fromField;
  const payments = transaction.payments || [];
  return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

export function getTransactionTotalAmount(transaction) {
  return Number(transaction?.amount) || 0;
}

function parseTransactionDate(dateStr) {
  if (!dateStr) return null;
  try {
    const iso = String(dateStr).length === 10 ? `${dateStr}T12:00:00` : dateStr;
    return parseISO(iso);
  } catch {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}

/** @param {'all' | '1month' | '3months' | '6months' | '1year'} period */
export function getSupplierPeriodRange(period) {
  const end = new Date();
  if (period === "all") return null;
  if (period === "1month") return { start: subMonths(end, 1), end };
  if (period === "3months") return { start: subMonths(end, 3), end };
  if (period === "6months") return { start: subMonths(end, 6), end };
  if (period === "1year") return { start: subMonths(end, 12), end };
  return null;
}

export function isTransactionInPeriod(transaction, period) {
  const range = getSupplierPeriodRange(period);
  if (!range) return true;
  const date = parseTransactionDate(transaction.date);
  if (!date) return false;
  return isWithinInterval(date, range);
}

/**
 * @param {Array} transactions - all supplier transactions
 * @param {'all' | '1month' | '3months' | '6months' | '1year'} period
 */
export function getSupplierPurchaseStats(transactions, period = "all") {
  const list = (transactions || []).filter(t => isTransactionInPeriod(t, period));
  let totalPurchase = 0;
  let totalPaid = 0;

  for (const t of list) {
    totalPurchase += getTransactionTotalAmount(t);
    totalPaid += getTransactionPaidAmount(t);
  }

  return {
    totalPurchase,
    totalPaid,
    transactionCount: list.length,
  };
}
