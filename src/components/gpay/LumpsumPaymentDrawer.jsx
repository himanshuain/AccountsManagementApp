"use client";

import { useState, useCallback } from "react";
import {
  IndianRupee,
  Wallet,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MultiImageUpload } from "@/components/ImageUpload";
import {
  FormDrawerHeader,
  FormSection,
  NO_SPIN_INPUT,
} from "@/components/form/FormDrawerUI";

/**
 * Lumpsum Payment Drawer
 *
 * Renders a compact trigger button + a bottom sheet drawer.
 * The trigger button is meant to be placed inline (e.g. in a bottom bar).
 */
export function LumpsumPaymentDrawer({
  type = "supplier",
  totalPending = 0,
  pendingItems = [],
  onPayBills,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isReturn, setIsReturn] = useState(false);
  const [receiptImages, setReceiptImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setAmount("");
    setNotes("");
    setIsReturn(false);
    setReceiptImages([]);
    setIsUploading(false);
    setIsSubmitting(false);
  }, []);

  const handleOpen = () => {
    if (disabled) {
      toast.error("Cannot pay while offline");
      return;
    }
    if (totalPending <= 0) {
      toast.info("No pending amount");
      return;
    }
    resetForm();
    setOpen(true);
  };

  const parsedAmount = Number(amount) || 0;
  const isOverLimit = parsedAmount > totalPending;
  const isValidAmount = parsedAmount > 0 && !isOverLimit;

  const handleSubmit = async () => {
    if (parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (isOverLimit) {
      toast.error(`Amount cannot exceed ₹${totalPending.toLocaleString("en-IN")}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const lumpsumTag = `Paid in Lumpsum of ₹${parsedAmount.toLocaleString("en-IN")}`;
      const lumpsumId = crypto.randomUUID();
      const lumpsumPaidAt = new Date().toISOString();
      const paymentNotes = notes.trim() || lumpsumTag;
      const payments = [];
      let remaining = parsedAmount;

      for (const item of pendingItems) {
        if (remaining <= 0) break;

        const itemPending = item.pendingAmount;
        if (itemPending <= 0) continue;

        const payAmount = Math.min(remaining, itemPending);
        remaining -= payAmount;

        payments.push({
          id: item.id,
          amount: payAmount,
          receiptUrls: receiptImages.length > 0 ? receiptImages : null,
          notes: paymentNotes,
          isReturn,
          lumpsumId,
          lumpsumTotal: parsedAmount,
          lumpsumPaidAt,
        });
      }

      if (payments.length === 0) {
        toast.error("No pending bills to pay");
        setIsSubmitting(false);
        return;
      }

      await onPayBills(payments);

      const paidCount = payments.length;
      toast.success(
        `Lumpsum ₹${parsedAmount.toLocaleString("en-IN")} applied to ${paidCount} ${
          type === "supplier" ? "bill" : "udhar"
        }${paidCount > 1 ? "s" : ""}`
      );
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Lumpsum payment failed:", error);
      toast.error("Failed to process lumpsum payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview: which bills will be paid (capped at totalPending for preview)
  const effectiveAmount = Math.min(parsedAmount, totalPending);
  const previewBills = [];
  let previewRemaining = effectiveAmount;
  let totalPayingAmount = 0;
  for (const item of pendingItems) {
    if (previewRemaining <= 0) {
      previewBills.push({ ...item, payAmount: 0, fullyPaid: false, untouched: true });
      continue;
    }
    if (item.pendingAmount <= 0) continue;
    const payAmount = Math.min(previewRemaining, item.pendingAmount);
    previewRemaining -= payAmount;
    totalPayingAmount += payAmount;
    previewBills.push({
      ...item,
      payAmount,
      fullyPaid: payAmount >= item.pendingAmount,
      untouched: false,
    });
  }
  const billsBeingPaid = previewBills.filter((b) => !b.untouched);
  const billsUntouched = previewBills.filter((b) => b.untouched);

  const billLabel = type === "supplier" ? "Bill" : "Udhar";

  return (
    <>
      {/* Compact trigger button — place this inline in a bottom bar */}
      <button
        onClick={handleOpen}
        disabled={disabled || totalPending <= 0}
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          totalPending > 0
            ? type === "supplier"
              ? "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400"
              : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
            : "bg-muted text-muted-foreground",
          "disabled:opacity-50"
        )}
      >
        <Wallet className="h-3.5 w-3.5" />
        Pay Lumpsum
      </button>

      {/* Lumpsum Payment Sheet */}
      <DragCloseDrawer
        open={open}
        onOpenChange={(val) => {
          if (!isSubmitting) {
            setOpen(val);
            if (!val) resetForm();
          }
        }}
        height="max-h-[90vh]"
      >
          <FormDrawerHeader
            title="Pay Lumpsum"
            icon={Wallet}
            onClose={() => {
              setOpen(false);
              resetForm();
            }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            canSubmit={!isSubmitting && !isUploading && isValidAmount}
          />

          <div className="space-y-4 px-4 py-4 pb-8">
            <div
              className={cn(
                "overflow-hidden rounded-2xl border p-4 text-center shadow-sm",
                type === "supplier"
                  ? "border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-rose-500/5"
                  : "border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-amber-500/5"
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Total pending
              </p>
              <p
                className={cn(
                  "mt-1 font-mono text-3xl font-bold tabular-nums",
                  type === "supplier"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                ₹{totalPending.toLocaleString("en-IN")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                across {pendingItems.length} {billLabel.toLowerCase()}
                {pendingItems.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div
              className={cn(
                "overflow-hidden rounded-2xl border p-4 shadow-sm",
                type === "supplier"
                  ? "border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-rose-500/5"
                  : "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
              )}
            >
              <label
                htmlFor="lumpsum-amount"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Lumpsum amount (₹)
              </label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  id="lumpsum-amount"
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className={cn(
                    "input-hero h-14 pl-12 font-mono text-3xl font-bold tabular-nums tracking-tight",
                    NO_SPIN_INPUT,
                    isOverLimit && "ring-2 ring-destructive/50 focus:ring-destructive"
                  )}
                  autoFocus
                />
              </div>
              {isOverLimit && (
                <div className="mt-2 flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <p className="text-xs">
                    Exceeds total pending of ₹{totalPending.toLocaleString("en-IN")}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setAmount(String(totalPending))}
                className={cn(
                  "mt-3 rounded-full px-3 py-1.5 font-mono text-sm transition-colors",
                  parsedAmount === totalPending
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-accent"
                )}
              >
                Full — ₹{totalPending.toLocaleString("en-IN")}
              </button>
            </div>

            <FormSection title="Return (GR)" bodyClassName="py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Mark as goods return</p>
                <button
                  type="button"
                  onClick={() => setIsReturn(prev => !prev)}
                  className={cn(
                    "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                    isReturn ? "bg-blue-500" : "bg-muted-foreground/30"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-1 h-5 w-5 rounded-full bg-white transition-transform",
                      isReturn ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </FormSection>

            <FormSection title="Notes">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Payment notes…"
                className="input-hero min-h-[72px] resize-none"
              />
            </FormSection>

            <FormSection title="Receipts" bodyClassName="py-3">
              <MultiImageUpload
                value={receiptImages}
                onChange={setReceiptImages}
                maxImages={5}
                layout="hero"
                attachLabel="Attach payment receipts"
                onUploadingChange={setIsUploading}
                folder="payments"
              />
            </FormSection>

            {/* Detailed Bills Preview */}
            {parsedAmount > 0 && !isOverLimit && previewBills.length > 0 && (
              <FormSection
                title={`${billLabel}s breakdown`}
                bodyClassName="p-0"
              >
                <div className="border-b border-border/40 px-4 py-2">
                  <span className="text-xs text-muted-foreground">
                    {billsBeingPaid.length} of {pendingItems.length} will be paid
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-muted/20">
                  {/* Bills being paid */}
                  {billsBeingPaid.map((bill, idx) => {
                    const pct = bill.totalAmount > 0
                      ? Math.round(((bill.paidAmount + bill.payAmount) / bill.totalAmount) * 100)
                      : 0;

                    return (
                      <div
                        key={bill.id}
                        className={cn(
                          "px-3 py-3",
                          idx !== 0 && "border-t border-border/50"
                        )}
                      >
                        {/* Top: description + paying amount */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                bill.fullyPaid
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {bill.fullyPaid ? <Check className="h-3 w-3" /> : idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium leading-tight">
                                {bill.description || `${billLabel} #${idx + 1}`}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {bill.date
                                  ? new Date(bill.date).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "2-digit",
                                    })
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 flex-col items-end">
                            <span className="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                              +₹{bill.payAmount.toLocaleString("en-IN")}
                            </span>
                            {bill.fullyPaid ? (
                              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                                Fully cleared
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                of ₹{bill.pendingAmount.toLocaleString("en-IN")} pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress: thin bar + remaining */}
                        <div className="mt-2 flex items-center gap-2 pl-7">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                bill.fullyPaid ? "bg-emerald-500" : "bg-emerald-500/60"
                              )}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {bill.fullyPaid
                              ? "₹0"
                              : `₹${(bill.pendingAmount - bill.payAmount).toLocaleString("en-IN")}`} left
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Untouched bills */}
                  {billsUntouched.length > 0 && (
                    <div className="border-t border-border bg-muted/10 px-3 py-2.5">
                      <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                        Not covered ({billsUntouched.length})
                      </p>
                      <div className="space-y-1">
                        {billsUntouched.map((bill, idx) => (
                          <div
                            key={bill.id}
                            className="flex items-center justify-between text-[11px] text-muted-foreground/70"
                          >
                            <span className="truncate">
                              {bill.description || `${billLabel} #${billsBeingPaid.length + idx + 1}`}
                            </span>
                            <span className="flex-shrink-0 font-mono">
                              ₹{bill.pendingAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary row */}
                  {billsBeingPaid.length > 0 && (
                    <div className="flex items-center justify-between border-t border-border bg-emerald-500/5 px-3 py-2.5">
                      <span className="text-[11px] text-muted-foreground">
                        {billsBeingPaid.filter((b) => b.fullyPaid).length} cleared
                        {billsBeingPaid.filter((b) => !b.fullyPaid).length > 0 &&
                          `, ${billsBeingPaid.filter((b) => !b.fullyPaid).length} partial`}
                      </span>
                      <span className="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{totalPayingAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>
              </FormSection>
            )}

            {/* Over-limit warning with details */}
            {isOverLimit && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm font-medium">Amount too high</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  You entered ₹{parsedAmount.toLocaleString("en-IN")} but the total pending is only ₹{totalPending.toLocaleString("en-IN")}.
                  Please reduce the amount by ₹{(parsedAmount - totalPending).toLocaleString("en-IN")}.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="h-12 flex-1"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="h-12 flex-[2]"
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading || !isValidAmount}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ₹${parsedAmount.toLocaleString("en-IN")}`
                )}
              </Button>
            </div>
          </div>
      </DragCloseDrawer>
    </>
  );
}

export default LumpsumPaymentDrawer;
