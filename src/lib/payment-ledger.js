/** Display-only note tag from LumpsumPaymentDrawer (not used for grouping) */
export const LUMPSUM_NOTE_PREFIX = "Paid in Lumpsum of ₹";

/** User-facing note on a payment row (hides auto lumpsum tag text). */
export function getPaymentDisplayNote(notes) {
  if (!notes?.trim()) return null;
  if (notes.startsWith(LUMPSUM_NOTE_PREFIX)) return null;
  return notes.trim();
}

/** Legacy records: cluster lumpsum lines within this window (ms) */
const LEGACY_LUMPSUM_WINDOW_MS = 60 * 60 * 1000;

/**
 * Hydrate structured lumpsum fields on legacy payments (notes → lumpsumTotal once).
 * Grouping always uses lumpsumId / lumpsumTotal / lumpsumPaidAt — never note text.
 */
function parseLegacyLumpsumTotal(notes) {
  if (!notes || !notes.startsWith(LUMPSUM_NOTE_PREFIX)) return null;
  const match = notes.match(/Paid in Lumpsum of ₹([\d,]+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

/**
 * @param {import('./payment-ledger').PaymentLedgerEntry} entry
 */
export function normalizeLedgerEntry(entry) {
  const p = entry.payment;
  let lumpsumId = p.lumpsumId ?? null;
  let lumpsumTotal =
    p.lumpsumTotal != null && p.lumpsumTotal !== "" ? Number(p.lumpsumTotal) : null;
  let lumpsumPaidAt = p.lumpsumPaidAt ?? null;

  if (!lumpsumId && lumpsumTotal == null) {
    const legacyTotal = parseLegacyLumpsumTotal(p.notes);
    if (legacyTotal != null) lumpsumTotal = legacyTotal;
  }

  if (Number.isNaN(lumpsumTotal)) lumpsumTotal = null;

  return {
    ...entry,
    payment: {
      ...p,
      lumpsumId,
      lumpsumTotal,
      lumpsumPaidAt,
    },
  };
}

export function isLumpsumPayment(payment) {
  if (!payment) return false;
  if (payment.lumpsumId) return true;
  return payment.lumpsumTotal != null && !Number.isNaN(Number(payment.lumpsumTotal));
}

/**
 * @param {import('./payment-ledger').PaymentLedgerEntry[]} entries
 * @returns {string[]} parallel group keys; empty string = not lumpsum
 */
function assignLumpsumGroupKeys(entries) {
  const keys = entries.map(entry => {
    const p = entry.payment;
    if (p.lumpsumId) return `id:${p.lumpsumId}`;
    if (p.lumpsumTotal != null && p.lumpsumPaidAt) {
      return `batch:${p.lumpsumTotal}:${p.lumpsumPaidAt}`;
    }
    return "";
  });

  const legacy = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry, index }) => keys[index] === "" && isLumpsumPayment(entry.payment));

  legacy.sort(
    (a, b) => new Date(a.entry.payment.date || 0) - new Date(b.entry.payment.date || 0)
  );

  let clusterSeq = 0;
  /** @type {{ total: number, lastMs: number, key: string } | null} */
  let open = null;

  for (const { entry, index } of legacy) {
    const total = Number(entry.payment.lumpsumTotal);
    const ms = new Date(entry.payment.date || 0).getTime();

    if (
      open &&
      open.total === total &&
      !Number.isNaN(ms) &&
      ms - open.lastMs <= LEGACY_LUMPSUM_WINDOW_MS
    ) {
      keys[index] = open.key;
      open.lastMs = ms;
    } else {
      const key = `legacy:${total}:${clusterSeq++}`;
      keys[index] = key;
      open = { total, lastMs: ms, key };
    }
  }

  return keys;
}

/**
 * @typedef {object} PaymentLedgerEntry
 * @property {string} key
 * @property {object} payment
 * @property {string} txnId
 * @property {string} billLabel
 * @property {number} billAmount
 * @property {string} billDate
 */

/**
 * @typedef {{ type: 'single', entry: PaymentLedgerEntry }} SingleLedgerGroup
 * @typedef {{ type: 'lumpsum', groupKey: string, lumpsumTotal: number, date: string, children: PaymentLedgerEntry[] }} LumpsumLedgerGroup
 * @typedef {SingleLedgerGroup | LumpsumLedgerGroup} PaymentLedgerGroup
 */

/**
 * @param {PaymentLedgerEntry[]} entries — already in display order (e.g. newest first)
 * @returns {PaymentLedgerGroup[]}
 */
export function groupPaymentLedgerEntries(entries) {
  const normalized = entries.map(normalizeLedgerEntry);
  const groupKeys = assignLumpsumGroupKeys(normalized);

  /** @type {Map<string, PaymentLedgerEntry[]>} */
  const lumpsumBuckets = new Map();

  normalized.forEach((entry, index) => {
    const key = groupKeys[index];
    if (!key) return;
    const bucket = lumpsumBuckets.get(key);
    if (bucket) bucket.push(entry);
    else lumpsumBuckets.set(key, [entry]);
  });

  const emitted = new Set();
  /** @type {PaymentLedgerGroup[]} */
  const result = [];

  normalized.forEach((entry, index) => {
    const key = groupKeys[index];
    if (!key) {
      result.push({ type: "single", entry });
      return;
    }
    if (emitted.has(key)) return;
    emitted.add(key);

    const children = lumpsumBuckets.get(key) || [entry];
    if (children.length === 1) {
      result.push({ type: "single", entry: children[0] });
    } else {
      const lumpsumTotal = Number(children[0].payment.lumpsumTotal) || 0;
      const date =
        children[0].payment.lumpsumPaidAt ||
        children[0].payment.date ||
        children.reduce((latest, c) => {
          const d = c.payment.date;
          return d && (!latest || new Date(d) > new Date(latest)) ? d : latest;
        }, "");
      result.push({
        type: "lumpsum",
        groupKey: key,
        lumpsumTotal,
        date,
        children,
      });
    }
  });

  return result;
}

/**
 * @param {PaymentLedgerEntry} entry
 */
export function paymentLedgerEntryMatchesQuery(entry, query, numQuery) {
  const { payment, billLabel, billAmount } = entry;
  if (String(payment.amount || "").includes(query)) return true;
  if (billLabel.toLowerCase().includes(query)) return true;
  if ((payment.notes || "").toLowerCase().includes(query)) return true;
  if (!Number.isNaN(numQuery) && (Number(payment.amount) === numQuery || billAmount === numQuery)) {
    return true;
  }
  if (!Number.isNaN(numQuery) && Number(payment.lumpsumTotal) === numQuery) return true;
  return false;
}

/**
 * @param {PaymentLedgerGroup[]} groups
 */
export function countPaymentLedgerEntries(groups) {
  return groups.reduce((n, g) => n + (g.type === "single" ? 1 : g.children.length), 0);
}

/**
 * @param {PaymentLedgerGroup[]} groups
 * @param {string} rawQuery
 * @param {(date: string, fmt: string) => string} formatDate — e.g. date-fns format(parseISO(...))
 */
export function filterPaymentLedgerGroups(groups, rawQuery, formatDate) {
  const query = rawQuery.toLowerCase().trim();
  if (!query) return groups;

  const numQuery = parseFloat(query.replace(/[₹,\s]/g, ""));

  return groups.filter(group => {
    if (group.type === "single") {
      const entry = group.entry;
      if (paymentLedgerEntryMatchesQuery(entry, query, numQuery)) return true;
      try {
        if (formatDate(entry.payment.date, "dd MMM yyyy").toLowerCase().includes(query)) {
          return true;
        }
        if (formatDate(entry.billDate, "dd MMM yyyy").toLowerCase().includes(query)) {
          return true;
        }
      } catch {
        /* ignore */
      }
      return false;
    }

    if (group.children.some(e => paymentLedgerEntryMatchesQuery(e, query, numQuery))) {
      return true;
    }

    try {
      if (formatDate(group.date, "dd MMM yyyy").toLowerCase().includes(query)) return true;
    } catch {
      /* ignore */
    }

    return false;
  });
}
