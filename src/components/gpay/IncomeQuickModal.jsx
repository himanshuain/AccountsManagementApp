"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { usePreventBodyScroll } from "@/hooks/usePreventBodyScroll";
import { getLocalDate } from "@/lib/date-utils";
import { BulkIncomeForm } from "@/components/settings";
import { cn } from "@/lib/utils";
import { Zap, CalendarRange } from "lucide-react";

/**
 * Quick Income Modal — single-day add or month-wise bulk entry
 */
export function IncomeQuickModal({
  open,
  onClose,
  onSubmit,
  incomeList = [],
  updateIncome,
}) {
  const today = getLocalDate();
  const [mode, setMode] = useState("quick");
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [date, setDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);

  usePreventBodyScroll(open);

  useEffect(() => {
    if (!open) {
      setMode("quick");
      setCashAmount("");
      setOnlineAmount("");
      setDate(today);
    }
  }, [open, today]);

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

  const modal = (
    <div className="fixed inset-0 z-[60] bg-black/60" onClick={onClose}>
      <div
        className={cn(
          "animate-slide-up absolute bottom-0 left-0 right-0 flex flex-col rounded-t-3xl bg-card",
          mode === "bulk" ? "max-h-[88dvh]" : "pb-nav"
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-center py-3">
          <div className="sheet-handle" />
        </div>

        <div
          className={cn(
            "px-4",
            mode === "bulk" ? "flex min-h-0 flex-1 flex-col pb-safe" : "pb-6"
          )}
        >
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h2 className="font-heading text-xl tracking-wide">Add Income</h2>
            {mode === "bulk" && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Month grid
              </span>
            )}
          </div>

          <div className="mb-4 flex shrink-0 gap-1 rounded-2xl bg-muted/80 p-1">
            <button
              type="button"
              onClick={() => setMode("quick")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all",
                mode === "quick"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              Quick
            </button>
            <button
              type="button"
              onClick={() => setMode("bulk")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all",
                mode === "bulk"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Bulk
            </button>
          </div>

          {mode === "quick" ? (
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
          ) : (
            <BulkIncomeForm
              embedded
              stickyFooter
              incomeList={incomeList}
              addIncome={onSubmit}
              updateIncome={updateIncome}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default IncomeQuickModal;
