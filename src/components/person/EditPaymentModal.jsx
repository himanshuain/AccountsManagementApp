"use client";

import { useState } from "react";
import { IndianRupee, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import { cn } from "@/lib/utils";
import { getLocalDate } from "@/lib/date-utils";
import { MultiImageUpload } from "@/components/ImageUpload";
import {
  FormDrawerHeader,
  FormSection,
  FormSubmitButton,
  NO_SPIN_INPUT,
} from "@/components/form/FormDrawerUI";

export function EditPaymentModal({ payment, txn, onClose, onSave, isSubmitting }) {
  const [amount, setAmount] = useState(String(payment?.amount || ""));
  const [date, setDate] = useState(payment?.date ? payment.date.split("T")[0] : getLocalDate());
  const [notes, setNotes] = useState(payment?.notes || "");
  const [isReturn, setIsReturn] = useState(!!payment?.isReturn);
  const [receiptImages, setReceiptImages] = useState(() => {
    if (payment?.receiptUrls && payment.receiptUrls.length > 0) {
      return payment.receiptUrls;
    }
    if (payment?.receiptUrl) {
      return [payment.receiptUrl];
    }
    return [];
  });
  const [isUploading, setIsUploading] = useState(false);

  const totalAmount = Number(txn?.amount) || 0;
  const otherPaidAmount = (txn?.payments || [])
    .filter(p => p.id !== payment?.id)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const maxAmount = totalAmount - otherPaidAmount;

  const initialReceipts = (() => {
    if (payment?.receiptUrls && payment.receiptUrls.length > 0) return payment.receiptUrls;
    if (payment?.receiptUrl) return [payment.receiptUrl];
    return [];
  })();

  const isFormDirty = () => {
    if (amount !== String(payment?.amount || "")) return true;
    if (date !== (payment?.date ? payment.date.split("T")[0] : getLocalDate())) return true;
    if (notes !== (payment?.notes || "")) return true;
    if (isReturn !== !!payment?.isReturn) return true;
    if (JSON.stringify(receiptImages) !== JSON.stringify(initialReceipts)) return true;
    return false;
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
    if (!isReturn && paymentAmount > maxAmount) {
      toast.error(`Max amount is ₹${maxAmount.toLocaleString("en-IN")}`);
      return;
    }
    onSave({
      amount: paymentAmount,
      date: date + "T00:00:00.000Z",
      notes: notes,
      receiptUrl: receiptImages[0] || null,
      receiptUrls: receiptImages,
      isReturn: isReturn,
    });
  };

  if (!payment) return null;

  const today = getLocalDate();
  const canSubmit = !isSubmitting && !!amount && !isUploading;

  return (
    <DragCloseDrawer
      open={true}
      onOpenChange={v => {
        if (!v) onClose();
      }}
      beforeClose={handleBeforeClose}
      height="h-[92vh]"
    >
      <FormDrawerHeader
        title="Edit Payment"
        icon={Pencil}
        onClose={handleClose}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        isEdit
        canSubmit={canSubmit}
      />

      <form onSubmit={handleFormSubmit} className="space-y-4 px-4 py-4 pb-8">
        <div className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 shadow-sm">
          <label
            htmlFor="edit-payment-amount"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Payment amount (₹)
          </label>
          <div className="relative">
            <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-emerald-600/70 dark:text-emerald-400/70" />
            <input
              id="edit-payment-amount"
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
          <p className="mt-2 text-xs text-muted-foreground">
            Max: ₹{maxAmount.toLocaleString("en-IN")}
          </p>
        </div>

        <FormSection title="Date">
          <input
            type="date"
            value={date}
            onChange={e => {
              const selectedDate = e.target.value;
              setDate(selectedDate > today ? today : selectedDate);
            }}
            max={today}
            className="input-hero h-12"
          />
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
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Payment notes…"
            className="input-hero h-12"
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
          Save changes
        </FormSubmitButton>
      </form>
    </DragCloseDrawer>
  );
}

export default EditPaymentModal;
