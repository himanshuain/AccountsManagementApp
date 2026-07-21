"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLocalDate } from "@/lib/date-utils";
import { BulkIncomeForm } from "@/components/settings";
import { cn } from "@/lib/utils";
import { Zap, CalendarRange, TrendingUp } from "lucide-react";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import {
  FormDrawerHeader,
  FormSection,
  FormSubmitButton,
  NO_SPIN_INPUT,
} from "@/components/form/FormDrawerUI";

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

  useEffect(() => {
    if (!open) {
      setMode("quick");
      setCashAmount("");
      setOnlineAmount("");
      setDate(today);
    }
  }, [open, today]);

  const handleSubmit = async e => {
    e?.preventDefault();
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

  const totalPreview = (Number(cashAmount) || 0) + (Number(onlineAmount) || 0);

  return (
    <DragCloseDrawer
      open={open}
      onOpenChange={v => {
        if (!v && !submitting) onClose();
      }}
      height={mode === "bulk" ? "h-[88dvh]" : "h-auto"}
    >
      <FormDrawerHeader
        title="Add Income"
        icon={TrendingUp}
        subtitle={mode === "bulk" ? "Month grid" : null}
        onClose={onClose}
        onSubmit={mode === "quick" ? handleSubmit : undefined}
        isSubmitting={submitting}
        canSubmit={mode === "quick" && totalPreview > 0}
      />

      <div
        className={cn(
          "px-4 py-4",
          mode === "bulk" ? "flex min-h-0 flex-1 flex-col pb-4" : "pb-8"
        )}
      >
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
            <FormSection title="Amounts">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Cash
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={cashAmount}
                    onChange={e => setCashAmount(e.target.value)}
                    className={cn("input-hero h-12 font-mono text-lg", NO_SPIN_INPUT)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Online
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={onlineAmount}
                    onChange={e => setOnlineAmount(e.target.value)}
                    className={cn("input-hero h-12 font-mono text-lg", NO_SPIN_INPUT)}
                  />
                </div>
              </div>
            </FormSection>

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

            {totalPreview > 0 && (
              <div className="overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 text-center shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Total
                </p>
                <p className="amount-positive mt-1 font-mono text-3xl font-bold tabular-nums">
                  ₹{totalPreview.toLocaleString("en-IN")}
                </p>
              </div>
            )}

            <FormSubmitButton disabled={submitting || totalPreview <= 0} isSubmitting={submitting}>
              Add income
            </FormSubmitButton>
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
    </DragCloseDrawer>
  );
}

export default IncomeQuickModal;
