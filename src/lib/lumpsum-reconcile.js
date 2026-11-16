import { LUMPSUM_NOTE_PREFIX } from "@/lib/payment-ledger";

/**
 * After one lumpsum slice is removed, sync lumpsumTotal + auto note on remaining siblings.
 * @param {object[]} records — all transactions or udhar rows in scope
 * @param {string} lumpsumId
 * @param {string | number | null} removedPaymentId
 * @returns {{ txnId: string, payments: object[] }[]}
 */
export function buildLumpsumSiblingPaymentUpdates(records, lumpsumId, removedPaymentId) {
  if (!lumpsumId) return [];

  const siblings = [];
  for (const record of records) {
    for (const p of record.payments || []) {
      if (p.lumpsumId !== lumpsumId) continue;
      if (removedPaymentId != null && p.id === removedPaymentId) continue;
      siblings.push({ txnId: record.id, payment: p });
    }
  }

  if (siblings.length === 0) return [];

  const newTotal = siblings.reduce((sum, { payment }) => sum + (Number(payment.amount) || 0), 0);
  const lumpsumTag = `${LUMPSUM_NOTE_PREFIX}${newTotal.toLocaleString("en-IN")}`;

  const txnIds = [...new Set(siblings.map(s => s.txnId))];
  const updates = [];

  for (const txnId of txnIds) {
    const record = records.find(r => r.id === txnId);
    if (!record) continue;

    let changed = false;
    const payments = (record.payments || []).map(p => {
      if (p.lumpsumId !== lumpsumId) return p;
      if (removedPaymentId != null && p.id === removedPaymentId) return p;

      let notes = p.notes;
      if (typeof notes === "string" && notes.startsWith(LUMPSUM_NOTE_PREFIX)) {
        notes = lumpsumTag;
      }

      changed = true;
      return {
        ...p,
        lumpsumTotal: newTotal,
        notes,
      };
    });

    if (changed) updates.push({ txnId, payments });
  }

  return updates;
}

/** Lumpsum metadata still says ₹25k but only ₹850 remains on bills (e.g. slice deleted). */
export function findStaleLumpsumPatches(records) {
  const lumpsumIds = new Set();
  for (const record of records) {
    for (const p of record.payments || []) {
      if (p.lumpsumId) lumpsumIds.add(p.lumpsumId);
    }
  }

  const merged = new Map();
  for (const lumpsumId of lumpsumIds) {
    let stored = 0;
    let allocated = 0;
    for (const record of records) {
      for (const p of record.payments || []) {
        if (p.lumpsumId !== lumpsumId) continue;
        allocated += Number(p.amount) || 0;
        stored = Number(p.lumpsumTotal) || stored;
      }
    }
    if (stored <= allocated) continue;

    for (const patch of buildLumpsumSiblingPaymentUpdates(records, lumpsumId, null)) {
      merged.set(patch.txnId, patch);
    }
  }

  return [...merged.values()];
}