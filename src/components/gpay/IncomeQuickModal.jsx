"use client";

import { useState } from "react";
import { toast } from "sonner";
import { usePreventBodyScroll } from "@/hooks/usePreventBodyScroll";
import { getLocalDate } from "@/lib/date-utils";

/**
 * Quick Income Modal Component for adding daily income
 */
export function IncomeQuickModal({ open, onClose, onSubmit }) {
  const today = getLocalDate();
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [date, setDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);

  usePreventBodyScroll(open);

  const handleSubmit = async e => {
    e.preventDefault();
    const cash = Number(cashAmount) || 0;
    const online = Number(onlineAmount) || 0;
    const total = cash + online;

    if (total <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      amount: total,
      cashAmount: cash,
      onlineAmount: online,
      date: date,
      type: "daily",
    });

    if (result.success) {
      toast.success("Income added");
      setCashAmount("");
      setOnlineAmount("");
      setDate(today);
      onClose();
    } else {
      toast.error(result.error || "Failed to add");
    }
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div
        className="pb-nav animate-slide-up absolute bottom-0 left-0 right-0 overscroll-contain rounded-t-3xl bg-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center py-3">
          <div className="sheet-handle" />
        </div>

        <div className="px-4 pb-6">
          <h2 className="mb-4 font-heading text-xl tracking-wide">Add Income</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Cash</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value)}
                  className="input-hero [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Online</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={onlineAmount}
                  onChange={e => setOnlineAmount(e.target.value)}
                  className="input-hero [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => {
                  const selectedDate = e.target.value;
                  if (selectedDate > today) {
                    setDate(today);
                  } else {
                    setDate(selectedDate);
                  }
                }}
                max={today}
                className="input-hero"
              />
            </div>

            {(Number(cashAmount) > 0 || Number(onlineAmount) > 0) && (
              <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="amount-positive font-mono text-2xl font-bold">
                  ₹
                  {((Number(cashAmount) || 0) + (Number(onlineAmount) || 0)).toLocaleString(
                    "en-IN"
                  )}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-hero w-full disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Income"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default IncomeQuickModal;
