"use client";

import { useState } from "react";
import { IndianRupee, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import { cn } from "@/lib/utils";
import { getLocalDate } from "@/lib/date-utils";
import { MultiImageUpload } from "@/components/ImageUpload";
import { FormDatePicker } from "@/components/form/FormDatePicker";
import {
  FormDrawerHeader,
  FormSection,
  FormSubmitButton,
  NO_SPIN_INPUT,
} from "@/components/form/FormDrawerUI";

/**
 * Payment Form Modal Component with hero receipt upload
 */
export function PaymentFormModal({ txn, onClose, onSubmit, isSubmitting }) {
  const today = getLocalDate();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [isReturn, setIsReturn] = useState(false);
  const [receiptImages, setReceiptImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const paidAmount = txn.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingAmount = (Number(txn.amount) || 0) - (Number(paidAmount) || 0);

  const isFormDirty = () => {
    return !!(amount || notes || receiptImages.length > 0 || isReturn || date !== today);
  };

  const handleBeforeClose = async () => {
    if (isSubmitting) return false;
    if (!isFormDirty()) return true;
    return confirm("You have unsaved changes. Are you sure you want to close?");
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  const handleFormSubmit = e => {
    e.preventDefault();
    const paymentAmount = Number(amount);
    if (!isReturn && paymentAmount <= 0) {
      toast.error("Enter valid amount");
      return;
    }
    if (isReturn && paymentAmount < 0) {
      toast.error("Amount cannot be negative");
      return;
    }
    if (!isReturn && paymentAmount > remainingAmount) {
      toast.error(`Max amount is ₹${remainingAmount.toLocaleString("en-IN")}`);
      return;
    }
    onSubmit(paymentAmount, date, false, receiptImages, notes, isReturn);
  };

  const canSubmit = !isSubmitting && !!amount && !isUploading;

  return (
    <DragCloseDrawer
      open={true}
      onOpenChange={v => {
        if (!v) onClose();
      }}
      beforeClose={handleBeforeClose}
      height="h-[92dvh]"
    >
      <FormDrawerHeader
        title="Record Payment"
        icon={CreditCard}
        onClose={handleClose}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        actionLabel="Record payment"
        canSubmit={canSubmit}
      />

      <form onSubmit={handleFormSubmit} className="space-y-4 px-4 py-4 pb-8">
        <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 text-center shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pending amount
          </p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            ₹{remainingAmount.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 shadow-sm">
          <label
            htmlFor="payment-amount"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Payment amount (₹)
          </label>
          <div className="relative">
            <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/70" />
            <input
              id="payment-amount"
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className={cn(
                "input-hero h-14 pl-12 font-mono text-3xl font-bold tabular-nums tracking-tight",
                NO_SPIN_INPUT
              )}
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={() => setAmount(String(remainingAmount))}
            className={cn(
              "mt-3 rounded-full px-3 py-1.5 font-mono text-sm transition-colors",
              Number(amount) === remainingAmount
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-accent"
            )}
          >
            Full — ₹{remainingAmount.toLocaleString("en-IN")}
          </button>
        </div>

        <FormSection title="Date">
          <FormDatePicker value={date} onChange={setDate} maxDate={today} />
        </FormSection>

        <FormSection title="Return (GR)" bodyClassName="py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Mark as goods return</p>
            <button
              type="button"
              onClick={() => {
                const newIsReturn = !isReturn;
                setIsReturn(newIsReturn);
                if (newIsReturn && !amount) {
                  setAmount("0");
                }
              }}
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

        <FormSubmitButton disabled={!canSubmit} isSubmitting={isSubmitting}>
          Record payment
        </FormSubmitButton>
      </form>
    </DragCloseDrawer>
  );
}

export default PaymentFormModal;
