import { LUMPSUM_NOTE_PREFIX } from "@/lib/payment-ledger";
import { computePaymentStatus } from "@/lib/computePaymentStatus";

export function paymentBelongsToLumpsumEdit(p, lumpsumId, childPaymentIds) {
  if (!p) return false;
  if (lumpsumId && p.lumpsumId === lumpsumId) return true;
  if (childPaymentIds?.size && p.id != null && childPaymentIds.has(p.id)) return true;
  return false;
}

/**
 * Pending pool for add (items already have pendingAmount) or edit (restore slices being replaced).
 * @param {object[]} records
 * @param {string | null} lumpsumId
 * @param {Set<string>} childPaymentIds
 * @param {(record: object) => number} getTotalAmount
 * @param {(record: object) => { description?: string, date?: string }} [getMeta]
 */
export function buildLumpsumPendingPool(
  records,
  lumpsumId,
  childPaymentIds,
  getTotalAmount,
  getMeta
) {
  const items = [];
  for (const record of records) {
    const totalAmount = getTotalAmount(record);
    const payments = record.payments || [];
    const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    let restored = 0;
    for (const p of payments) {
      if (paymentBelongsToLumpsumEdit(p, lumpsumId, childPaymentIds)) {
        restored += Number(p.amount) || 0;
      }
    }
    const pendingAmount = Math.max(0, totalAmount - paid + restored);
    if (pendingAmount <= 0) continue;

    const meta = getMeta ? getMeta(record) : {};
    const paidExcludingEdit = Math.max(0, paid - restored);
    items.push({
      id: record.id,
      description: meta.description,
      totalAmount,
      paidAmount: paidExcludingEdit,
      pendingAmount,
      date: meta.date || record.date || record.createdAt,
    });
  }

  items.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  return items;
}

/**
 * Apply lumpsum total to pending items (earliest first).
 * @param {{ id: string, pendingAmount: number }[]} items
 * @param {number} totalAmount
 */
export function allocateLumpsumAmount(items, totalAmount) {
  let remaining = Math.max(0, Number(totalAmount) || 0);
  const allocations = [];
  const preview = [];

  for (const item of items) {
    if (remaining <= 0) {
      preview.push({ ...item, payAmount: 0, fullyPaid: false, untouched: true });
      continue;
    }
    const pending = Math.max(0, Number(item.pendingAmount) || 0);
    if (pending <= 0) continue;

    const payAmount = Math.min(remaining, pending);
    remaining -= payAmount;
    allocations.push({ id: item.id, amount: payAmount });
    preview.push({
      ...item,
      payAmount,
      fullyPaid: payAmount >= pending,
      untouched: false,
    });
  }

  return { allocations, preview, unapplied: remaining };
}

/**
 * @returns {{ id: string, payments: object[], paidAmount: number, paymentStatus: string, paidDate: string | null }[]}
 */
export function planLumpsumReplace(
  records,
  {
    lumpsumId,
    childPaymentIds = new Set(),
    lumpsumTotal,
    paymentDate,
    notes = "",
    isReturn = false,
    receiptUrls = null,
    getTotalAmount,
    getMeta,
  }
) {
  const total = Number(lumpsumTotal) || 0;
  if (total <= 0) {
    return { ok: false, error: "Invalid amount", updates: [] };
  }

  const pool = buildLumpsumPendingPool(
    records,
    lumpsumId,
    childPaymentIds,
    getTotalAmount,
    getMeta
  );
  const maxPending = pool.reduce((sum, i) => sum + i.pendingAmount, 0);
  if (total > maxPending) {
    return {
      ok: false,
      error: `Amount cannot exceed ₹${maxPending.toLocaleString("en-IN")} pending`,
      updates: [],
    };
  }

  const { allocations } = allocateLumpsumAmount(pool, total);
  if (allocations.length === 0) {
    return { ok: false, error: "No pending bills to apply", updates: [] };
  }

  const effectiveLumpsumId = lumpsumId || crypto.randomUUID();
  const paidAt = paymentDate || new Date().toISOString();
  const lumpsumTag = `${LUMPSUM_NOTE_PREFIX}${total.toLocaleString("en-IN")}`;
  const paymentNotes = notes.trim() ? notes.trim() : lumpsumTag;
  const receipts = receiptUrls
    ? Array.isArray(receiptUrls)
      ? receiptUrls
      : [receiptUrls]
    : [];

  const byId = new Map();
  for (const record of records) {
    const payments = (record.payments || []).filter(
      p => !paymentBelongsToLumpsumEdit(p, lumpsumId, childPaymentIds)
    );
    byId.set(record.id, { ...record, payments: [...payments] });
  }

  const touched = new Set();
  for (const record of records) {
    if ((record.payments || []).some(p => paymentBelongsToLumpsumEdit(p, lumpsumId, childPaymentIds))) {
      touched.add(record.id);
    }
  }

  for (const { id, amount } of allocations) {
    const row = byId.get(id);
    if (!row) continue;
    row.payments.push({
      id: crypto.randomUUID(),
      amount,
      date: paidAt,
      receiptUrl: receipts[0] || null,
      receiptUrls: receipts,
      notes: paymentNotes,
      isReturn,
      lumpsumId: effectiveLumpsumId,
      lumpsumTotal: total,
      lumpsumPaidAt: paidAt,
    });
    byId.set(id, row);
    touched.add(id);
  }

  const updates = [];
  for (const id of touched) {
    const row = byId.get(id);
    if (!row) continue;
    const payments = row.payments || [];
    const paidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const billTotal = getTotalAmount(row);
    const paymentStatus = computePaymentStatus(paidAmount, billTotal);
    updates.push({
      id,
      payments,
      paidAmount,
      paymentStatus,
      paidDate: paymentStatus === "paid" ? paidAt : null,
    });
  }

  return { ok: true, updates, lumpsumId: effectiveLumpsumId };
}

/**
 * Remove every payment in a lumpsum group in one pass (no per-slice sibling churn).
 * @returns {{ ok: boolean, error?: string, updates: object[] }}
 */
export function planLumpsumRemoval(records, { lumpsumId = null, childPaymentIds = new Set(), getTotalAmount }) {
  const childIds =
    childPaymentIds instanceof Set
      ? childPaymentIds
      : new Set((childPaymentIds || []).filter(Boolean).map(String));

  let touched = false;
  const updates = [];

  for (const record of records) {
    const payments = (record.payments || []).filter(
      p => !paymentBelongsToLumpsumEdit(p, lumpsumId, childIds)
    );
    if (payments.length === (record.payments || []).length) continue;
    touched = true;

    const paidAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const billTotal = getTotalAmount(record);
    const paymentStatus = computePaymentStatus(paidAmount, billTotal);

    updates.push({
      id: record.id,
      payments,
      paidAmount,
      paymentStatus,
      paidDate: paymentStatus === "paid" ? record.paidDate || new Date().toISOString() : null,
    });
  }

  if (!touched) {
    return { ok: false, error: "Lumpsum payments not found", updates: [] };
  }

  return { ok: true, updates };
}