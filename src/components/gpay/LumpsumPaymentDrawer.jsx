"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  IndianRupee,
  Wallet,
  Loader2,
  Check,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getLocalDate } from "@/lib/date-utils";
import { MultiImageUpload } from "@/components/ImageUpload";
import { FormDatePicker } from "@/components/form/FormDatePicker";
import {
  FormDrawerHeader,
  FormSection,
  NO_SPIN_INPUT,
} from "@/components/form/FormDrawerUI";
import {
  allocateLumpsumAmount,
  buildLumpsumPendingPool,
} from "@/lib/lumpsum-allocate";
import { getPaymentDisplayNote, LUMPSUM_NOTE_PREFIX } from "@/lib/payment-ledger";

function LumpsumCoveredBillsSection({ type, parsedAmount, isOverLimit, previewBills, pendingCount }) {
  if (parsedAmount <= 0 || isOverLimit || previewBills.length === 0) return null;

  const billLabel = type === "supplier" ? "Bill" : "Udhar";
  const billsBeingPaid = previewBills.filter(b => !b.untouched);
  const billsUntouched = previewBills.filter(b => b.untouched);
  const totalPayingAmount = billsBeingPaid.reduce((sum, b) => sum + (Number(b.payAmount) || 0), 0);

  return (
    <FormSection title={`Covered ${billLabel.toLowerCase()}s`} bodyClassName="p-0">
      <div className="border-b border-border/40 px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {billsBeingPaid.length} of {pendingCount} will be paid
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-muted/20">
        {billsBeingPaid.map((bill, idx) => {
          const pct =
            bill.totalAmount > 0
              ? Math.round(((bill.paidAmount + bill.payAmount) / bill.totalAmount) * 100)
              : 0;

          return (
            <div
              key={bill.id}
              className={cn("px-3 py-3", idx !== 0 && "border-t border-border/50")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
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
                    : `₹${(bill.pendingAmount - bill.payAmount).toLocaleString("en-IN")}`}{" "}
                  left
                </span>
              </div>
            </div>
          );
        })}

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

        {billsBeingPaid.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-emerald-500/5 px-3 py-2.5">
            <span className="text-[11px] text-muted-foreground">
              {billsBeingPaid.filter(b => b.fullyPaid).length} cleared
              {billsBeingPaid.filter(b => !b.fullyPaid).length > 0 &&
                `, ${billsBeingPaid.filter(b => !b.fullyPaid).length} partial`}
            </span>
            <span className="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
              ₹{totalPayingAmount.toLocaleString("en-IN")}
            </span>
          </div>
        )}
      </div>
    </FormSection>
  );
}

/**
 * Lumpsum Payment Drawer — add flow (trigger) + edit flow (controlled).
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
  const [date, setDate] = useState(getLocalDate());
  const [notes, setNotes] = useState("");
  const [isReturn, setIsReturn] = useState(false);
  const [receiptImages, setReceiptImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setAmount("");
    setDate(getLocalDate());
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

  const { preview: previewBills } = useMemo(() => {
    const effectiveAmount = Math.min(parsedAmount, totalPending);
    const withUntouched = [];
    let remaining = effectiveAmount;
    for (const item of pendingItems) {
      if (remaining <= 0) {
        withUntouched.push({ ...item, payAmount: 0, fullyPaid: false, untouched: true });
        continue;
      }
      if (item.pendingAmount <= 0) continue;
      const payAmount = Math.min(remaining, item.pendingAmount);
      remaining -= payAmount;
      withUntouched.push({
        ...item,
        payAmount,
        fullyPaid: payAmount >= item.pendingAmount,
        untouched: false,
      });
    }
    return { preview: withUntouched };
  }, [parsedAmount, totalPending, pendingItems]);

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
      const paymentDateIso = `${date}T00:00:00.000Z`;
      const lumpsumTag = `Paid in Lumpsum of ₹${parsedAmount.toLocaleString("en-IN")}`;
      const lumpsumId = crypto.randomUUID();
      const paymentNotes = notes.trim() || lumpsumTag;
      const { allocations } = allocateLumpsumAmount(pendingItems, parsedAmount);
      const payments = allocations.map(({ id, amount: payAmount }) => ({
        id,
        amount: payAmount,
        receiptUrls: receiptImages.length > 0 ? receiptImages : null,
        notes: paymentNotes,
        isReturn,
        lumpsumId,
        lumpsumTotal: parsedAmount,
        lumpsumPaidAt: paymentDateIso,
      }));

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

  const billLabel = type === "supplier" ? "Bill" : "Udhar";

  return (
    <>
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

      <DragCloseDrawer
        open={open}
        onOpenChange={val => {
          if (!isSubmitting) {
            setOpen(val);
            if (!val) resetForm();
          }
        }}
        height="max-h-[90dvh]"
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
          actionLabel="Pay lumpsum"
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
                onChange={e => setAmount(e.target.value)}
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

          <LumpsumCoveredBillsSection
            type={type}
            parsedAmount={parsedAmount}
            isOverLimit={isOverLimit}
            previewBills={previewBills}
            pendingCount={pendingItems.length}
          />

          <FormSection title="Payment date" bodyClassName="py-3">
            <FormDatePicker value={date} onChange={setDate} max={getLocalDate()} />
          </FormSection>

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

          {isOverLimit && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm font-medium">Amount too high</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                You entered ₹{parsedAmount.toLocaleString("en-IN")} but the total pending is only ₹
                {totalPending.toLocaleString("en-IN")}. Please reduce the amount by ₹
                {(parsedAmount - totalPending).toLocaleString("en-IN")}.
              </p>
            </div>
          )}

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

export function EditLumpsumPaymentDrawer({
  open,
  onOpenChange,
  group,
  type = "supplier",
  records = [],
  onSave,
  isSubmitting = false,
}) {
  const groupPayment = group?.children?.[0]?.payment;
  const lumpsumId = groupPayment?.lumpsumId ?? null;
  const childPaymentIds = useMemo(
    () => new Set((group?.children || []).map(c => c.payment?.id).filter(Boolean)),
    [group]
  );

  const getTotalAmount = useCallback(
    record =>
      type === "supplier"
        ? Number(record.amount) || 0
        : Number(record.amount) || (Number(record.cashAmount) || 0) + (Number(record.onlineAmount) || 0),
    [type]
  );

  const getMeta = useCallback(
    record =>
      type === "supplier"
        ? {
            description: record.itemName || record.description || record.itemDescription || record.notes,
            date: record.date || record.createdAt,
          }
        : {
            description: record.description || record.notes,
            date: record.date || record.createdAt,
          },
    [type]
  );

  const pendingPool = useMemo(
    () => buildLumpsumPendingPool(records, lumpsumId, childPaymentIds, getTotalAmount, getMeta),
    [records, lumpsumId, childPaymentIds, getTotalAmount, getMeta]
  );

  const maxEditable = useMemo(
    () => pendingPool.reduce((sum, i) => sum + i.pendingAmount, 0),
    [pendingPool]
  );

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getLocalDate());
  const [notes, setNotes] = useState("");
  const [isReturn, setIsReturn] = useState(false);
  const [receiptImages, setReceiptImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!open || !group) return;
    const total = Number(group.lumpsumTotal) || 0;
    const paidAt = group.date || groupPayment?.date;
    setAmount(String(total));
    setDate(paidAt ? String(paidAt).split("T")[0] : getLocalDate());
    const rawNotes = groupPayment?.notes || "";
    setNotes(
      rawNotes.startsWith(LUMPSUM_NOTE_PREFIX) ? "" : getPaymentDisplayNote(rawNotes) || rawNotes
    );
    setIsReturn(!!groupPayment?.isReturn);
    const receipts =
      groupPayment?.receiptUrls?.length > 0
        ? groupPayment.receiptUrls
        : groupPayment?.receiptUrl
          ? [groupPayment.receiptUrl]
          : [];
    setReceiptImages(receipts);
  }, [open, group, groupPayment]);

  const parsedAmount = Number(amount) || 0;
  const isOverLimit = parsedAmount > maxEditable;
  const isValidAmount = parsedAmount > 0 && !isOverLimit;

  const { preview: previewBills } = useMemo(() => {
    if (parsedAmount <= 0 || isOverLimit) return { preview: [] };
    return allocateLumpsumAmount(pendingPool, parsedAmount);
  }, [parsedAmount, isOverLimit, pendingPool]);

  const handleSubmit = async () => {
    if (!group) return;
    if (parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (isOverLimit) {
      toast.error(`Amount cannot exceed ₹${maxEditable.toLocaleString("en-IN")}`);
      return;
    }

    const paymentDateIso = `${date}T00:00:00.000Z`;
    await onSave({
      lumpsumId,
      childPaymentIds: [...childPaymentIds],
      lumpsumTotal: parsedAmount,
      paymentDate: paymentDateIso,
      notes,
      isReturn,
      receiptUrls: receiptImages.length > 0 ? receiptImages : null,
    });
  };

  if (!group) return null;

  return (
    <DragCloseDrawer
      open={open}
      onOpenChange={val => {
        if (!isSubmitting) onOpenChange(val);
      }}
      height="max-h-[90dvh]"
    >
      <FormDrawerHeader
        title="Edit Lumpsum"
        icon={Pencil}
        onClose={() => onOpenChange(false)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isEdit
        canSubmit={!isSubmitting && !isUploading && isValidAmount}
        actionLabel="Save lumpsum"
      />

      <div className="space-y-4 px-4 py-4 pb-8">
        <div
          className={cn(
            "overflow-hidden rounded-2xl border p-4 shadow-sm",
            type === "supplier"
              ? "border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-rose-500/5"
              : "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
          )}
        >
          <label
            htmlFor="edit-lumpsum-amount"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Lumpsum amount (₹)
          </label>
          <div className="relative">
            <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground/70" />
            <input
              id="edit-lumpsum-amount"
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className={cn(
                "input-hero h-14 pl-12 font-mono text-3xl font-bold tabular-nums tracking-tight",
                NO_SPIN_INPUT,
                isOverLimit && "ring-2 ring-destructive/50 focus:ring-destructive"
              )}
            />
          </div>
          {isOverLimit && (
            <div className="mt-2 flex items-center gap-1.5 text-destructive">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <p className="text-xs">
                Exceeds available pending of ₹{maxEditable.toLocaleString("en-IN")}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setAmount(String(maxEditable))}
            className={cn(
              "mt-3 rounded-full px-3 py-1.5 font-mono text-sm transition-colors",
              parsedAmount === maxEditable
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-accent"
            )}
          >
            Max — ₹{maxEditable.toLocaleString("en-IN")}
          </button>
        </div>

        <LumpsumCoveredBillsSection
          type={type}
          parsedAmount={parsedAmount}
          isOverLimit={isOverLimit}
          previewBills={previewBills}
          pendingCount={pendingPool.length}
        />

        <FormSection title="Payment date" bodyClassName="py-3">
          <FormDatePicker value={date} onChange={setDate} max={getLocalDate()} />
        </FormSection>

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

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="h-12 flex-1"
            onClick={() => onOpenChange(false)}
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
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>
    </DragCloseDrawer>
  );
}

export default LumpsumPaymentDrawer;