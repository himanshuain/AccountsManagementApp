"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format, parseISO, isWeekend } from "date-fns";
import { RefreshCw, Save, Banknote, Smartphone, CalendarDays, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getLocalDate, getMonthOptions, getDaysInMonth } from "@/lib/date-utils";

function buildRowsForMonth(monthKey, incomeList) {
  const existingByDate = {};
  incomeList.forEach(item => {
    if (item.type !== "daily") return;
    const dateKey = item.date?.substring(0, 10);
    if (!dateKey?.startsWith(monthKey)) return;
    if (!existingByDate[dateKey]) {
      existingByDate[dateKey] = item;
    }
  });

  return getDaysInMonth(monthKey).map(date => {
    const existing = existingByDate[date];
    const cash =
      existing?.cashAmount != null && Number(existing.cashAmount) > 0
        ? String(existing.cashAmount)
        : "";
    const online =
      existing?.onlineAmount != null && Number(existing.onlineAmount) > 0
        ? String(existing.onlineAmount)
        : "";
    return {
      date,
      cash,
      online,
      existingId: existing?.id || null,
      initialCash: existing ? Number(existing.cashAmount) || 0 : 0,
      initialOnline: existing ? Number(existing.onlineAmount) || 0 : 0,
    };
  });
}

function rowHasChanges(row) {
  const cash = Number(row.cash) || 0;
  const online = Number(row.online) || 0;
  if (!row.existingId) return cash + online > 0;
  return cash !== row.initialCash || online !== row.initialOnline;
}

const compactInputClass =
  "h-9 w-full rounded-lg border-0 bg-background/80 px-2 text-center font-mono text-sm outline-none transition-all placeholder:text-muted-foreground/40 focus:bg-background focus:ring-2 focus:ring-emerald-500/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/**
 * Month-wise bulk income entry — one row per day with cash and online columns
 */
export function BulkIncomeForm({
  incomeList = [],
  addIncome,
  updateIncome,
  embedded = false,
  stickyFooter = false,
  listMaxHeight = "45vh",
}) {
  const today = getLocalDate();
  const currentMonth = today.substring(0, 7);
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [rows, setRows] = useState(() => buildRowsForMonth(currentMonth, incomeList));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRows(buildRowsForMonth(selectedMonth, incomeList));
  }, [selectedMonth, incomeList]);

  const updateRow = useCallback((date, field, value) => {
    setRows(prev =>
      prev.map(row => (row.date === date ? { ...row, [field]: value } : row))
    );
  }, []);

  const changedRows = useMemo(() => rows.filter(rowHasChanges), [rows]);

  const eligibleDays = useMemo(() => rows.filter(r => r.date <= today).length, [rows, today]);

  const monthTotal = useMemo(() => {
    return rows.reduce((sum, row) => {
      if (row.date > today) return sum;
      return sum + (Number(row.cash) || 0) + (Number(row.online) || 0);
    }, 0);
  }, [rows, today]);

  const filledCount = useMemo(() => {
    return rows.filter(row => {
      if (row.date > today) return false;
      return (Number(row.cash) || 0) + (Number(row.online) || 0) > 0;
    }).length;
  }, [rows, today]);

  const progressPercent = eligibleDays ? Math.round((filledCount / eligibleDays) * 100) : 0;

  const handleSave = async () => {
    const toSave = changedRows.filter(row => row.date <= today);
    if (toSave.length === 0) {
      toast.error("Enter at least one cash or online amount");
      return;
    }

    setSubmitting(true);
    let saved = 0;
    let failed = 0;

    for (const row of toSave) {
      const cash = Number(row.cash) || 0;
      const online = Number(row.online) || 0;
      const total = cash + online;

      if (total <= 0) continue;

      const incomeData = {
        cashAmount: cash,
        onlineAmount: online,
        amount: total,
        date: row.date,
        type: "daily",
      };

      const result = row.existingId
        ? await updateIncome(row.existingId, incomeData)
        : await addIncome(incomeData);

      if (result.success) {
        saved++;
      } else {
        failed++;
      }
    }

    setSubmitting(false);

    if (failed === 0) {
      toast.success(`Saved ${saved} ${saved === 1 ? "entry" : "entries"}`);
    } else if (saved > 0) {
      toast.error(`Saved ${saved}, failed ${failed}`);
    } else {
      toast.error("Failed to save income");
    }
  };

  const listClassName = cn(
    "scrollbar-none min-h-0 overflow-y-auto",
    stickyFooter ? "flex-1" : ""
  );

  return (
    <div
      className={cn(
        embedded
          ? stickyFooter
            ? "flex min-h-0 flex-1 flex-col gap-3"
            : "space-y-3"
          : "theme-card mb-6 mt-4 space-y-3 p-4"
      )}
    >
      {!embedded && (
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Bulk Add (Month-wise)</h3>
          {changedRows.length > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              {changedRows.length} unsaved
            </span>
          )}
        </div>
      )}

      {/* Month picker */}
      <div className="shrink-0">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Month
          </label>
          {embedded && changedRows.length > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              {changedRows.length} unsaved
            </span>
          )}
        </div>
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="input-hero appearance-none pr-10 font-medium"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {/* Table */}
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-muted/20",
          stickyFooter && "min-h-0 flex-1"
        )}
        style={stickyFooter ? undefined : { maxHeight: listMaxHeight }}
      >
        {/* Sticky column headers */}
        <div className="grid shrink-0 grid-cols-[3.25rem_1fr_1fr] gap-2 border-b border-border/40 bg-card/80 px-2 py-2 backdrop-blur-sm">
          <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Day
          </span>
          <span className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Banknote className="h-3 w-3 text-emerald-600/70 dark:text-emerald-400/70" />
            Cash
          </span>
          <span className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Smartphone className="h-3 w-3 text-sky-600/70 dark:text-sky-400/70" />
            Online
          </span>
        </div>

        <div className={listClassName}>
          {rows.map((row, index) => {
            const isFuture = row.date > today;
            const isToday = row.date === today;
            const hasValue = (Number(row.cash) || 0) + (Number(row.online) || 0) > 0;
            const isChanged = rowHasChanges(row);
            const dayDate = parseISO(`${row.date}T12:00:00`);
            const weekend = isWeekend(dayDate);
            const rowTotal = (Number(row.cash) || 0) + (Number(row.online) || 0);

            return (
              <div
                key={row.date}
                className={cn(
                  "grid grid-cols-[3.25rem_1fr_1fr] items-center gap-2 px-2 py-1.5 transition-colors",
                  index % 2 === 0 ? "bg-transparent" : "bg-muted/15",
                  isFuture && "opacity-35",
                  weekend && !isFuture && "bg-muted/25",
                  isChanged && "!bg-amber-500/[0.07]",
                  hasValue && !isChanged && !isFuture && "!bg-emerald-500/[0.06]"
                )}
              >
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-lg py-1.5",
                    isToday
                      ? "bg-emerald-500/15 ring-1 ring-emerald-500/40"
                      : hasValue
                        ? "bg-emerald-500/10"
                        : "bg-muted/40"
                  )}
                >
                  {isToday && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                  <span
                    className={cn(
                      "font-mono text-sm font-bold leading-none",
                      isToday && "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {format(dayDate, "d")}
                  </span>
                  <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {format(dayDate, "EEE")}
                  </span>
                </div>

                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  value={row.cash}
                  disabled={isFuture || submitting}
                  onChange={e => updateRow(row.date, "cash", e.target.value)}
                  className={cn(
                    compactInputClass,
                    Number(row.cash) > 0 && "font-semibold text-emerald-700 dark:text-emerald-300"
                  )}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  value={row.online}
                  disabled={isFuture || submitting}
                  onChange={e => updateRow(row.date, "online", e.target.value)}
                  className={cn(
                    compactInputClass,
                    Number(row.online) > 0 && "font-semibold text-sky-700 dark:text-sky-300"
                  )}
                />

                {hasValue && !isFuture && (
                  <span className="sr-only">
                    {format(dayDate, "d MMM")}: ₹{rowTotal.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        className={cn(
          "shrink-0 space-y-3",
          stickyFooter && "border-t border-border/40 bg-card/95 pt-3 backdrop-blur-sm"
        )}
      >
        <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-3.5">
          <div className="mb-2.5 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Month total
              </p>
              <p className="amount-positive font-mono text-2xl font-bold tracking-tight">
                ₹{monthTotal.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold text-foreground">
                {filledCount}/{eligibleDays}
              </p>
              <p className="text-[10px] text-muted-foreground">days filled</p>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={submitting || changedRows.length === 0}
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold text-white transition-all",
            changedRows.length > 0
              ? "bg-emerald-600 shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 active:scale-[0.98]"
              : "bg-muted text-muted-foreground",
            submitting && "opacity-70"
          )}
        >
          {submitting ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4" />
              {changedRows.length > 0
                ? `Save ${changedRows.length} ${changedRows.length === 1 ? "Entry" : "Entries"}`
                : "Save Entries"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default BulkIncomeForm;
