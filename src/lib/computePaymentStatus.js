/**
 * Domain payment lifecycle: pending → partial → paid (amount-driven).
 * @param {number} paidAmount
 * @param {number} totalAmount
 * @returns {'pending' | 'partial' | 'paid'}
 */
export function computePaymentStatus(paidAmount, totalAmount) {
  const paid = Number(paidAmount) || 0;
  const total = Number(totalAmount) || 0;
  if (paid >= total) {
    return "paid";
  }
  if (paid > 0) {
    return "partial";
  }
  return "pending";
}