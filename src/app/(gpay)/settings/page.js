"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import {
  ChevronRight,
  ArrowLeft,
  IndianRupee,
  Download,
  Upload,
  LogOut,
  Database,
  RefreshCw,
  Cloud,
  HardDrive,
  Lock,
  Pencil,
  Trash2,
  X,
  Check,
  Plus,
  Sun,
  Moon,
  FileDown,
  CalendarDays,
  Banknote,
  Smartphone,
  Eye,
  EyeOff,
  ImageIcon,
  Fingerprint,
  Shield,
  MoreVertical,
  Percent,
  Mail,
  AlertTriangle,
  Table2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, subYears } from "date-fns";
import { toast } from "sonner";

import { useIncome } from "@/hooks/useIncome";
import { useTransactions } from "@/hooks/useTransactions";
import { useUdhar } from "@/hooks/useUdhar";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCustomers } from "@/hooks/useCustomers";
import { useStorage } from "@/hooks/useStorage";
import { useBiometricLock } from "@/hooks/useBiometricLock";
import { usePreventBodyScroll } from "@/hooks/usePreventBodyScroll";
import { exportSupplierTransactionsPDF, exportCustomerTransactionsPDF } from "@/lib/export";
import { TransactionForm } from "@/components/TransactionForm";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { getLocalDate, getMonthOptions, getAvailableMonths } from "@/lib/date-utils";
import { CHART_DURATION_OPTIONS, INCOME_FILTER_OPTIONS, ITEMS_PER_PAGE } from "@/lib/constants";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { IncomeItem, IncomeChart, BulkIncomeForm, StorageInfo } from "@/components/settings";

// Income Modal Component
function IncomeModal({ open, onClose }) {
  const { incomeList = [], addIncome, updateIncome, deleteIncome } = useIncome();
  const today = getLocalDate();
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [date, setDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isMonthly, setIsMonthly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selectedFilterMonth, setSelectedFilterMonth] = useState("");
  const [showOnlyMonthlyEntries, setShowOnlyMonthlyEntries] = useState(false);
  const [chartDuration, setChartDuration] = useState("6months");
  const [profitMargin, setProfitMargin] = useState(40);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [activeIncomeForm, setActiveIncomeForm] = useState(null);

  // Load profit margin from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("income-profit-margin");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        setProfitMargin(parsed);
      }
    }
  }, []);

  // Save profit margin to localStorage when changed
  const handleProfitMarginChange = value => {
    setProfitMargin(value);
    localStorage.setItem("income-profit-margin", String(value));
  };

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const availableFilterMonths = useMemo(() => getAvailableMonths(incomeList), [incomeList]);

  usePreventBodyScroll(open);

  useEffect(() => {
    if (!open) {
      setActiveIncomeForm(null);
    }
  }, [open]);

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filter, selectedFilterMonth, showOnlyMonthlyEntries]);

  // Load more items
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + ITEMS_PER_PAGE);
  };

  // Filter income list
  const filteredIncomeList = useMemo(() => {
    const now = new Date();
    let startDate;
    let endDate = now;
    let filtered;

    switch (filter) {
      case "monthly":
        if (!selectedFilterMonth) {
          // If no month selected, show current month
          const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          filtered = incomeList.filter(i => {
            const d = new Date(i.date);
            const itemMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            return itemMonth === currentMonthKey;
          });
        } else {
          filtered = incomeList.filter(i => {
            const d = new Date(i.date);
            const itemMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            return itemMonth === selectedFilterMonth;
          });
        }
        // Apply "monthly only" filter if toggle is on
        if (showOnlyMonthlyEntries) {
          filtered = filtered.filter(i => i.type === "monthly");
        }
        // Sort by date within the month (newest first)
        return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
      case "3months":
        startDate = subMonths(now, 3);
        break;
      case "6months":
        startDate = subMonths(now, 6);
        break;
      case "thisYear":
        startDate = startOfYear(now);
        break;
      case "lastYear":
        startDate = startOfYear(subYears(now, 1));
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        return [...incomeList].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    filtered = incomeList.filter(i => {
      const d = new Date(i.date);
      return d >= startDate && d <= endDate;
    });

    // Sort by date (newest first)
    return [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [incomeList, filter, selectedFilterMonth, showOnlyMonthlyEntries]);

  // Chart data - dynamic based on selected duration
  const chartData = useMemo(() => {
    const now = new Date();
    const data = [];

    // Get number of months based on duration
    const durationOption = CHART_DURATION_OPTIONS.find(o => o.value === chartDuration);
    const numMonths = durationOption?.months || 6;

    for (let i = numMonths - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthIncome = incomeList.filter(item => {
        const d = new Date(item.date);
        return d >= monthStart && d <= monthEnd;
      });

      const total = monthIncome.reduce((sum, item) => {
        const cash = Number(item.cashAmount) || 0;
        const online = Number(item.onlineAmount) || 0;
        return sum + (Number(item.amount) || cash + online);
      }, 0);

      data.push({
        label: format(monthDate, numMonths > 6 ? "MMM" : "MMM"),
        fullLabel: format(monthDate, "MMM yy"),
        value: total,
      });
    }

    return data;
  }, [incomeList, chartDuration]);

  // Calculate totals
  const totals = useMemo(() => {
    const income = incomeList || [];

    const calcTotal = list =>
      list.reduce((sum, i) => {
        const cash = Number(i.cashAmount) || 0;
        const online = Number(i.onlineAmount) || 0;
        return sum + (Number(i.amount) || cash + online);
      }, 0);

    return {
      total: calcTotal(income),
      filtered: calcTotal(filteredIncomeList),
    };
  }, [incomeList, filteredIncomeList]);

  const resetForm = () => {
    setCashAmount("");
    setOnlineAmount("");
    setDate(today);
    setSelectedMonth(format(new Date(), "yyyy-MM"));
    setIsMonthly(false);
  };

  const handleSubmit = async () => {
    const cash = Number(cashAmount) || 0;
    const online = Number(onlineAmount) || 0;
    const total = cash + online;

    if (total <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);

    // For monthly, use first day of selected month
    const incomeDate = isMonthly ? `${selectedMonth}-01` : date;

    const incomeData = {
      amount: total,
      cashAmount: cash,
      onlineAmount: online,
      date: incomeDate,
      type: isMonthly ? "monthly" : "daily",
    };

    const result = await addIncome(incomeData);
    if (result.success) {
      toast.success("Income added");
      resetForm();
      setActiveIncomeForm(null);
    } else {
      toast.error(result.error || "Failed to add");
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    const result = await deleteIncome(deleteItem.id);
    if (result.success) {
      toast.success("Income deleted");
      setDeleteItem(null);
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  return (
    <DragCloseDrawer
      open={open}
      onOpenChange={v => { if (!v && !deleteItem) onClose(); }}
      height="max-h-[90vh]"
    >
        <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 pb-3 pt-1 backdrop-blur-md">
          <h2 className="font-heading text-xl">Income Tracker</h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveIncomeForm(prev => (prev === "add" ? null : "add"))}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                activeIncomeForm === "add"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted/60"
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add Income
            </button>
            <button
              type="button"
              onClick={() => setActiveIncomeForm(prev => (prev === "bulk" ? null : "bulk"))}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                activeIncomeForm === "bulk"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted/60"
              )}
            >
              <Table2 className="h-4 w-4 shrink-0" />
              Bulk Add
            </button>
          </div>
        </div>

        <div className="px-4 pb-6 pt-4">
          {activeIncomeForm === "add" && (
            <div className="theme-card mb-6 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium">Add Income</h3>
                <button
                  type="button"
                  onClick={() => setActiveIncomeForm(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Close add income"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-muted p-3">
                  <span className="text-sm font-medium">Monthly Income</span>
                  <button
                    type="button"
                    onClick={() => setIsMonthly(!isMonthly)}
                    className={cn(
                      "relative h-6 w-12 rounded-full transition-colors",
                      isMonthly ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                        isMonthly ? "translate-x-7" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Banknote className="h-3 w-3" /> Cash Amount
                  </label>
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
                  <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Smartphone className="h-3 w-3" /> Online Amount
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={onlineAmount}
                    onChange={e => setOnlineAmount(e.target.value)}
                    className="input-hero [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" /> {isMonthly ? "Month" : "Date"}
                  </label>
                  {isMonthly ? (
                    <select
                      value={selectedMonth}
                      onChange={e => setSelectedMonth(e.target.value)}
                      className="input-hero"
                    >
                      {monthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
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
                  )}
                </div>

                {(Number(cashAmount) > 0 || Number(onlineAmount) > 0) && (
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-mono text-2xl font-semibold tabular-nums">
                      ₹
                      {((Number(cashAmount) || 0) + (Number(onlineAmount) || 0)).toLocaleString(
                        "en-IN"
                      )}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-hero flex h-12 w-full items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Save Income
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeIncomeForm === "bulk" && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">Bulk Add (Month-wise)</h3>
                <button
                  type="button"
                  onClick={() => setActiveIncomeForm(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Close bulk add"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <BulkIncomeForm
                incomeList={incomeList}
                addIncome={addIncome}
                updateIncome={updateIncome}
              />
            </div>
          )}

          <div className="stat-card mb-6 text-center">
            <p className="text-label mb-1">Total revenue</p>
            <p className="font-mono text-xl font-semibold tabular-nums">
              ₹{totals.total.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 font-mono text-xs text-money-positive">
              ₹{Math.round((totals.total * profitMargin) / 100).toLocaleString("en-IN")} est. profit
            </p>
          </div>

          <IncomeChart
            data={chartData}
            duration={chartDuration}
            onDurationChange={setChartDuration}
            profitMargin={profitMargin}
            onProfitMarginChange={handleProfitMarginChange}
            className="mb-6"
          />

          {/* Filter Chips */}
          <div className="my-4">
            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2">
              {INCOME_FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFilter(opt.value);
                    // Reset selected month when switching to monthly filter
                    if (opt.value === "monthly" && availableFilterMonths.length > 0) {
                      setSelectedFilterMonth(availableFilterMonths[0].value);
                    }
                  }}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    filter === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Month Selector when Monthly filter is active */}
            {filter === "monthly" && availableFilterMonths.length > 0 && (
              <div className="mt-3 space-y-3">
                <select
                  value={selectedFilterMonth}
                  onChange={e => setSelectedFilterMonth(e.target.value)}
                  className="w-full rounded-xl border-0 bg-muted p-3 text-sm font-medium focus:ring-2 focus:ring-primary"
                >
                  {availableFilterMonths.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Toggle for Monthly entries only */}
                <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                  <span className="text-sm font-medium">Monthly entries only</span>
                  <button
                    type="button"
                    onClick={() => setShowOnlyMonthlyEntries(!showOnlyMonthlyEntries)}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      showOnlyMonthlyEntries ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                        showOnlyMonthlyEntries ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>
            )}

            {filter !== "all" && (
              <p className="mt-2 text-sm text-muted-foreground">
                Filtered total:{" "}
                <span className="font-mono font-semibold">
                  ₹{totals.filtered.toLocaleString("en-IN")}
                </span>
                {filter === "monthly" && filteredIncomeList.length > 0 && (
                  <span className="ml-2">({filteredIncomeList.length} entries)</span>
                )}
              </p>
            )}
          </div>

          {/* Recent Income */}
          <div>
            <h3 className="mb-2 font-medium">Recent Income</h3>
            <p className="mb-3 text-xs text-muted-foreground">Tap to expand and edit or delete</p>
            <div className="space-y-2">
              {filteredIncomeList.slice(0, displayCount).map(item => (
                <IncomeItem
                  key={item.id}
                  item={item}
                  onUpdate={updateIncome}
                  onDelete={setDeleteItem}
                  profitMargin={profitMargin}
                />
              ))}
              {filteredIncomeList.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No income recorded</p>
              )}
              {filteredIncomeList.length > 0 && (
                <InfiniteScrollTrigger
                  onLoadMore={handleLoadMore}
                  hasMore={displayCount < filteredIncomeList.length}
                  isLoading={false}
                  loadedCount={Math.min(displayCount, filteredIncomeList.length)}
                  totalCount={filteredIncomeList.length}
                />
              )}
            </div>
          </div>
        </div>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={open => !open && setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Income"
        description={
          deleteItem
            ? `Delete income of ₹${Number(deleteItem.amount || (deleteItem.cashAmount || 0) + (deleteItem.onlineAmount || 0)).toLocaleString("en-IN")}?`
            : ""
        }
      />
    </DragCloseDrawer>
  );
}

// Backup Modal Component
const BROKEN_BILLS_CACHE_KEY = "broken_bills_report_v1";

function BackupModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [cleanupAnalysis, setCleanupAnalysis] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [brokenBillsReport, setBrokenBillsReport] = useState(null);
  const [brokenBillsLoading, setBrokenBillsLoading] = useState(false);
  const [reuploadLoading, setReuploadLoading] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const brokenBillsScanningRef = useRef(false);
  const [backupEmail, setBackupEmail] = useState("");
  const [autoBackupEmail, setAutoBackupEmail] = useState("");
  const [savingAutoEmail, setSavingAutoEmail] = useState(false);
  const { suppliers = [] } = useSuppliers();
  const { transactions = [], updateTransaction } = useTransactions(null, { fetchAll: true });
  const { customers = [] } = useCustomers();
  const { udharList = [] } = useUdhar({ fetchAll: true });

  usePreventBodyScroll(open);

  useEffect(() => {
    const saved = localStorage.getItem("backup_email");
    if (saved) setBackupEmail(saved);
  }, []);

  useEffect(() => {
    if (open) {
      fetch("/api/settings?key=backup_email")
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data?.value) setAutoBackupEmail(res.data.value);
        })
        .catch(() => {});

      try {
        const cached = sessionStorage.getItem(BROKEN_BILLS_CACHE_KEY);
        if (cached) setBrokenBillsReport(JSON.parse(cached));
      } catch {
        /* ignore */
      }
    }
  }, [open]);

  const persistBrokenBillsReport = useCallback(data => {
    setBrokenBillsReport(data);
    try {
      sessionStorage.setItem(BROKEN_BILLS_CACHE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, []);

  const handleScanBrokenBills = useCallback(async () => {
    if (brokenBillsScanningRef.current) return;
    brokenBillsScanningRef.current = true;
    setBrokenBillsLoading(true);
    try {
      const response = await fetch("/api/images/broken-bills");
      const result = await response.json();
      if (result.success) {
        persistBrokenBillsReport(result.data);
        if (result.data.brokenTransactionCount === 0) {
          toast.success("All bill images load correctly.");
        } else {
          toast.error(
            `${result.data.brokenTransactionCount} transactions with broken bill photos`
          );
        }
      } else {
        toast.error(result.error || "Scan failed");
      }
    } catch {
      toast.error("Failed to scan bill images");
    }
    setBrokenBillsLoading(false);
    brokenBillsScanningRef.current = false;
  }, [persistBrokenBillsReport]);

  const handleOpenReupload = useCallback(async item => {
    if (!item?.transactionId || reuploadLoading) return;

    const cached = transactions.find(t => t.id === item.transactionId);
    if (cached) {
      setEditingTransaction(cached);
      setTransactionFormOpen(true);
      return;
    }

    setReuploadLoading(true);
    try {
      const response = await fetch(`/api/transactions/${item.transactionId}`);
      const result = await response.json();
      if (result.success && result.data) {
        setEditingTransaction(result.data);
        setTransactionFormOpen(true);
      } else {
        toast.error(result.error || "Could not load transaction");
      }
    } catch {
      toast.error("Could not load transaction");
    }
    setReuploadLoading(false);
  }, [transactions, reuploadLoading]);

  const handleBackup = async () => {
    if (!backupEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(backupEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    localStorage.setItem("backup_email", backupEmail);
    setLoading(true);
    try {
      const response = await fetch("/api/backup/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: backupEmail }),
      });
      const result = await response.json();
      if (result.success) toast.success(`Backup sent to ${backupEmail}`);
      else toast.error(result.error || "Backup failed");
    } catch {
      toast.error("Backup failed");
    }
    setLoading(false);
  };

  const handleSaveAutoBackupEmail = async () => {
    if (!autoBackupEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(autoBackupEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setSavingAutoEmail(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "backup_email", value: autoBackupEmail }),
      });
      const data = await res.json();
      if (data.success) toast.success("Auto-backup email saved");
      else toast.error(data.error || "Failed to save");
    } catch {
      toast.error("Failed to save auto-backup email");
    }
    setSavingAutoEmail(false);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/backup");
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: "application/json" });
      const filename = `backup-${format(new Date(), "yyyy-MM-dd")}.json`;

      if (navigator.share && /android|iphone|ipad/i.test(navigator.userAgent)) {
        const file = new File([blob], filename, { type: "application/json" });
        await navigator.share({ files: [file], title: "Shop Backup" });
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      toast.success("Backup downloaded");
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Export failed");
    }
    setLoading(false);
  };

  const handleExportAllPDF = async () => {
    setLoading(true);
    try {
      const zip = new JSZip();
      const suppliersFolder = zip.folder("Suppliers");
      const customersFolder = zip.folder("Customers");
      let exported = 0;

      suppliers.forEach(supplier => {
        const supplierTxns = transactions.filter(t => t.supplierId === supplier.id);
        if (supplierTxns.length > 0) {
          try {
            const { blob, filename } = exportSupplierTransactionsPDF(supplier, supplierTxns, { asBlob: true });
            const safeName = (supplier.companyName || supplier.name || "supplier").replace(/[/\\?%*:|"<>]/g, "_");
            suppliersFolder.file(`${safeName}.pdf`, blob);
            exported++;
          } catch (e) {
            console.error("PDF export failed for", supplier.name, e);
          }
        }
      });

      customers.forEach(customer => {
        const customerUdhars = udharList.filter(u => u.customerId === customer.id);
        if (customerUdhars.length > 0) {
          try {
            const { blob } = exportCustomerTransactionsPDF(customer, customerUdhars, { asBlob: true });
            const safeName = (customer.name || "customer").replace(/[/\\?%*:|"<>]/g, "_");
            customersFolder.file(`${safeName}.pdf`, blob);
            exported++;
          } catch (e) {
            console.error("PDF export failed for", customer.name, e);
          }
        }
      });

      if (exported === 0) {
        toast.error("No suppliers or customers with transactions to export");
        setLoading(false);
        return;
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const filename = `all_reports_${new Date().toISOString().slice(0, 10)}.zip`;

      if (navigator.share && navigator.canShare && /android|iphone|ipad/i.test(navigator.userAgent)) {
        const file = new File([zipBlob], filename, { type: "application/zip" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "All Reports" });
        } else {
          const url = URL.createObjectURL(zipBlob);
          window.open(url, "_blank");
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
      } else {
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported ${exported} PDF reports as ZIP`);
    } catch (e) {
      console.error("ZIP export failed:", e);
      toast.error("Failed to export reports");
    }
    setLoading(false);
  };

  const handleAnalyzeStorage = async () => {
    setCleanupLoading(true);
    try {
      const response = await fetch("/api/storage/cleanup");
      const result = await response.json();
      if (result.success) {
        setCleanupAnalysis(result);
        if (result.analysis.orphanedCount === 0) {
          toast.success("Storage is clean! No unused files found.");
        }
      } else {
        toast.error(result.error || "Analysis failed");
      }
    } catch {
      toast.error("Failed to analyze storage");
    }
    setCleanupLoading(false);
  };

  const handleCleanupStorage = async () => {
    if (!cleanupAnalysis || cleanupAnalysis.analysis.orphanedCount === 0) {
      toast.error("No unused files to delete");
      return;
    }

    setCleanupLoading(true);
    try {
      const response = await fetch("/api/storage/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Deleted ${result.deleted} unused files`);
        setCleanupAnalysis(null);
      } else {
        toast.error(result.error || "Cleanup failed");
      }
    } catch {
      toast.error("Failed to cleanup storage");
    }
    setCleanupLoading(false);
  };

  return (
    <DragCloseDrawer open={open} onOpenChange={v => !v && onClose()} height="max-h-[85vh]">
        <div className="px-4 pb-6">
          <h2 className="mb-6 font-heading text-2xl">Backup & Export</h2>

          <div className="theme-card mb-4 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Cloud Backup</h3>
                <p className="text-xs text-muted-foreground">Send backup to your email</p>
              </div>
            </div>
            <div className="mb-3 flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                value={backupEmail}
                onChange={e => setBackupEmail(e.target.value)}
                className="input-hero flex-1 text-sm"
              />
            </div>
            <button
              onClick={handleBackup}
              disabled={loading || !backupEmail}
              className="btn-hero flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}{" "}
              Send Backup to Email
            </button>
          </div>

          <div className="theme-card mb-4 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <HardDrive className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-medium">Local Export</h3>
                <p className="text-xs text-muted-foreground">Download backup file to device</p>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-muted font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              <Download className="h-5 w-5" /> Download Data File to Device
            </button>
          </div>

          <div className="theme-card mb-4 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <FileDown className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-medium">Export All Reports</h3>
                <p className="text-xs text-muted-foreground">
                  Download all supplier &amp; customer reports as ZIP
                </p>
              </div>
            </div>
            <button
              onClick={handleExportAllPDF}
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-muted font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />} Download All Reports (ZIP)
            </button>
          </div>

          {/* Auto Backup Email Config */}
          <div className="theme-card mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                <Mail className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-medium">Daily Auto Backup</h3>
                <p className="text-xs text-muted-foreground">
                  Automatic backup sent daily at 12:00 AM
                </p>
              </div>
            </div>
            <div className="mb-3 flex gap-2">
              <input
                type="email"
                placeholder="Auto-backup email"
                value={autoBackupEmail}
                onChange={e => setAutoBackupEmail(e.target.value)}
                className="input-hero flex-1 text-sm"
              />
              <button
                onClick={handleSaveAutoBackupEmail}
                disabled={savingAutoEmail || !autoBackupEmail}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingAutoEmail ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the email where daily automatic backups will be sent.
            </p>
          </div>

          {/* Broken Bill Images */}
          <div className="theme-card mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-medium">Broken Bill Photos</h3>
                <p className="text-xs text-muted-foreground">
                  Bills that fail to load in the app (not ones already working)
                </p>
              </div>
            </div>

            {brokenBillsReport && brokenBillsReport.brokenTransactionCount > 0 && (
              <div className="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-xl bg-red-500/10 p-3">
                <p className="text-sm font-medium text-red-600">
                  {brokenBillsReport.brokenTransactionCount} transactions ·{" "}
                  {brokenBillsReport.brokenBillRefs} missing photos
                </p>
                {brokenBillsReport.broken.slice(0, 30).map(item => (
                  <div
                    key={item.transactionId}
                    className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.supplierName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.date || "No date"} · {item.missingCount}/{item.totalBillCount} missing
                        {item.amount != null ? ` · ₹${Number(item.amount).toLocaleString("en-IN")}` : ""}
                      </p>
                    </div>
                    {item.reuploadUrl && (
                      <button
                        type="button"
                        onClick={() => handleOpenReupload(item)}
                        disabled={reuploadLoading}
                        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Re-upload
                      </button>
                    )}
                  </div>
                ))}
                {brokenBillsReport.broken.length > 30 && (
                  <p className="text-center text-xs text-muted-foreground">
                    +{brokenBillsReport.broken.length - 30} more — re-scan after fixing batches
                  </p>
                )}
              </div>
            )}

            {brokenBillsReport && brokenBillsReport.brokenTransactionCount === 0 && (
              <p className="mb-3 text-sm text-emerald-600">All bill photos load correctly.</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleScanBrokenBills}
                disabled={brokenBillsLoading}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-muted font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                {brokenBillsLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
                Scan
              </button>
              {brokenBillsReport && (
                <button
                  onClick={handleScanBrokenBills}
                  disabled={brokenBillsLoading}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 font-medium transition-colors hover:bg-accent disabled:opacity-50"
                  title="Refresh scan after re-uploading"
                >
                  <RefreshCw className={`h-5 w-5 ${brokenBillsLoading ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>
            {brokenBillsReport?.brokenTransactionCount > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Re-upload opens the same edit form as the supplier profile. Tap refresh when done.
              </p>
            )}
          </div>

          <TransactionForm
            open={transactionFormOpen}
            onOpenChange={open => {
              setTransactionFormOpen(open);
              if (!open) setEditingTransaction(null);
            }}
            onSubmit={data =>
              editingTransaction
                ? updateTransaction(editingTransaction.id, data).then(r => {
                    if (r.success) {
                      toast.success("Updated");
                      setTransactionFormOpen(false);
                      setEditingTransaction(null);
                    }
                    return r;
                  })
                : Promise.resolve({ success: false })
            }
            suppliers={suppliers}
            initialData={editingTransaction}
            defaultSupplierId={editingTransaction?.supplierId}
            title="Edit Transaction"
          />

          {/* Storage Cleanup */}
          <div className="theme-card p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                <Trash2 className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium">Storage Cleanup</h3>
                <p className="text-xs text-muted-foreground">Remove unused images from storage</p>
              </div>
            </div>

            {cleanupAnalysis && cleanupAnalysis.analysis.orphanedCount > 0 && (
              <div className="mb-3 rounded-xl bg-amber-500/10 p-3">
                <p className="text-sm font-medium text-amber-600">
                  Found {cleanupAnalysis.analysis.orphanedCount} unused files
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Object.entries(cleanupAnalysis.analysis.orphanedByFolder || {})
                    .map(([folder, count]) => `${folder}: ${count}`)
                    .join(", ")}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAnalyzeStorage}
                disabled={cleanupLoading}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-muted font-medium transition-colors hover:bg-accent disabled:opacity-50"
              >
                {cleanupLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Database className="h-5 w-5" />
                )}
                Analyze
              </button>
              {cleanupAnalysis && cleanupAnalysis.analysis.orphanedCount > 0 && (
                <button
                  onClick={handleCleanupStorage}
                  disabled={cleanupLoading}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                >
                  {cleanupLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                  Delete {cleanupAnalysis.analysis.orphanedCount}
                </button>
              )}
            </div>
          </div>
        </div>
    </DragCloseDrawer>
  );
}

// Change PIN Modal Component
function ChangePinModal({ open, onClose }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  usePreventBodyScroll(open);

  const handleSubmit = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      toast.error("Please fill all fields");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("New PINs don't match");
      return;
    }
    if (newPin.length < 4) {
      toast.error("PIN must be at least 4 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPin, newPassword: newPin }),
      });
      const result = await response.json();

      if (result.success) {
        toast.success("PIN changed successfully");
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
        onClose();
      } else {
        toast.error(result.error || "Failed to change PIN");
      }
    } catch {
      toast.error("Failed to change PIN");
    }
    setLoading(false);
  };

  return (
    <DragCloseDrawer open={open} onOpenChange={v => !v && onClose()} height="h-auto">
        <div className="px-4 pb-6">
          <h2 className="mb-6 font-heading text-2xl">Change PIN</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Current PIN</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value)}
                  placeholder="Enter current PIN"
                  className="input-hero pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-muted-foreground">New PIN</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  placeholder="Enter new PIN"
                  className="input-hero pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Confirm New PIN</label>
              <input
                type={showNew ? "text" : "password"}
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                placeholder="Confirm new PIN"
                className="input-hero"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-hero mt-6 flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              Change PIN
            </button>
          </div>
        </div>
    </DragCloseDrawer>
  );
}

// Biometric Settings Modal
function BiometricSettingsModal({ open, onClose, settings, updateSettings, isAvailable }) {
  usePreventBodyScroll(open);

  const handleToggle = key => {
    if (key === "enabled" && !settings.enabled) {
      // When enabling, also enable protection for both sections by default
      updateSettings({ enabled: true, protectIncome: true });
    } else if (key === "enabled" && settings.enabled) {
      // When disabling, disable all protections
      updateSettings({ enabled: false, protectIncome: false });
    } else {
      updateSettings({ [key]: !settings[key] });
    }
  };

  return (
    <DragCloseDrawer open={open} onOpenChange={v => !v && onClose()} height="max-h-[90vh]">
        <div className="p-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-xl">Biometric Lock</h2>
            <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!isAvailable && (
            <div className="mb-4 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-600">
              <p className="mb-1 font-medium">Biometrics Not Available</p>
              <p className="text-xs">
                Your device doesn&apos;t support biometric authentication or it&apos;s not set up.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Main Enable Toggle */}
            <div
              className={cn(
                "flex items-center justify-between rounded-xl p-4 transition-colors",
                settings.enabled ? "bg-emerald-500/10" : "bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    settings.enabled ? "bg-emerald-500/20" : "bg-muted-foreground/10"
                  )}
                >
                  <Fingerprint
                    className={cn(
                      "h-5 w-5",
                      settings.enabled ? "text-emerald-500" : "text-muted-foreground"
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium">Enable Biometric Lock</p>
                  <p className="text-xs text-muted-foreground">Use fingerprint or Face ID</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle("enabled")}
                disabled={!isAvailable}
                className={cn(
                  "relative h-7 w-12 rounded-full transition-colors",
                  settings.enabled ? "bg-emerald-500" : "bg-muted-foreground/30",
                  !isAvailable && "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 h-5 w-5 rounded-full bg-white transition-transform",
                    settings.enabled ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Protected Sections */}
            {settings.enabled && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <p className="px-1 text-sm text-muted-foreground">Protected Sections</p>

                  {/* Income Tracker */}
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <IndianRupee className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium">Income Tracker</span>
                    </div>
                    <button
                      onClick={() => handleToggle("protectIncome")}
                      className={cn(
                        "relative h-6 w-10 rounded-full transition-colors",
                        settings.protectIncome ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                          settings.protectIncome ? "translate-x-5" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Info */}
            <div className="mt-4 rounded-xl bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground">
                <Shield className="mr-1 inline h-3 w-3" />
                When enabled, you&apos;ll need to authenticate with your device&apos;s biometrics to
                access protected sections. The lock resets when you close the app.
              </p>
            </div>
          </div>
        </div>
    </DragCloseDrawer>
  );
}

// Main Settings Page
export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [changePinModalOpen, setChangePinModalOpen] = useState(false);
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  // Biometric lock settings
  const {
    settings: biometricSettings,
    updateSettings: updateBiometricSettings,
    isBiometricAvailable,
    isProtected,
    canAccess,
    requestUnlock,
    startRelockTimer,
    cancelRelockTimer,
  } = useBiometricLock();

  // Handle opening protected modals with biometric check
  const handleOpenProtectedModal = async (section, openFn) => {
    // Cancel any pending relock timer when opening
    cancelRelockTimer();

    // If the section is protected and user doesn't have access
    if (isProtected(section) && !canAccess(section)) {
      // Request biometric unlock
      const result = await requestUnlock();
      if (result.success) {
        openFn(true);
      } else if (result.error && result.error !== "Authentication cancelled") {
        toast.error(result.error);
      }
    } else {
      // Not protected or already unlocked
      openFn(true);
    }
  };

  // Handle closing protected modals - start relock timer
  const handleCloseProtectedModal = (section, closeFn) => {
    closeFn(false);
    // Start relock timer if the section is protected
    if (isProtected(section)) {
      startRelockTimer();
    }
  };

  // Prevent hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
      router.push("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    toast.success(theme === "dark" ? "Light mode" : "Dark mode");
  };

  // Use stable defaults for SSR, then update on client
  const isDark = mounted ? theme === "dark" : false;

  const menuItems = [
    {
      section: "Business",
      items: [
        {
          icon: IndianRupee,
          label: "Income",
          sublabel: isProtected("income") ? "Protected" : "Track earnings",
          iconColor: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
          borderColor: "border-emerald-500/20",
          onClick: () => handleOpenProtectedModal("income", setIncomeModalOpen),
          badge: isProtected("income") ? "lock" : null,
        },
        {
          icon: Database,
          label: "Backup",
          sublabel: "Export data",
          iconColor: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-500/10 dark:bg-amber-500/20",
          borderColor: "border-amber-500/20",
          onClick: () => setBackupModalOpen(true),
        },
      ],
    },
    {
      section: "Appearance",
      custom: true,
    },
    {
      section: "Security",
      items: [
        {
          icon: Fingerprint,
          label: "Biometric",
          sublabel: biometricSettings.enabled ? "Enabled" : "Set up",
          iconColor: biometricSettings.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500",
          bgColor: biometricSettings.enabled ? "bg-emerald-500/10 dark:bg-emerald-500/20" : "bg-muted/50",
          borderColor: biometricSettings.enabled ? "border-emerald-500/20" : "border-border",
          onClick: () => handleOpenProtectedModal("biometric-settings", setBiometricModalOpen),
          badge: biometricSettings.enabled ? "shield" : null,
        },
        {
          icon: Lock,
          label: "Change PIN",
          sublabel: "Update PIN",
          iconColor: "text-slate-600 dark:text-slate-400",
          bgColor: "bg-slate-500/10 dark:bg-slate-500/20",
          borderColor: "border-slate-500/20",
          onClick: () => setChangePinModalOpen(true),
        },
      ],
    },
    {
      section: "Account",
      items: [
        {
          icon: LogOut,
          label: "Logout",
          sublabel: "Sign out",
          iconColor: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-500/10 dark:bg-red-500/20",
          borderColor: "border-red-500/20",
          onClick: handleLogout,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="header-glass sticky top-0 z-20 border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-heading text-xl">Settings</h1>
        </div>
      </div>

      <div className="space-y-6 px-4 py-4 pb-safe">
        <details className="group">
          <summary className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer list-none flex items-center gap-1">
            <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
            Storage
          </summary>
          <StorageInfo />
        </details>

        {menuItems.map(section => {
          if (section.custom) {
            return (
              <div key={section.section}>
                <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {section.section}
                </h2>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={toggleTheme}
                  className="stat-card flex w-full items-center gap-3 text-left"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted/50">
                    {isDark ? (
                      <Moon className="h-5 w-5 text-foreground" />
                    ) : (
                      <Sun className="h-5 w-5 text-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Appearance</p>
                    <p className="text-caption">{isDark ? "Dark mode" : "Light mode"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </motion.button>
              </div>
            );
          }

          return (
            <div key={section.section}>
              <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {section.section}
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {section.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.label}
                      whileTap={{ scale: 0.95 }}
                      onClick={item.onClick}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:shadow-none",
                        item.bgColor,
                        item.borderColor
                      )}
                    >
                      {item.badge && (
                        <span className="absolute right-2 top-2 text-[10px]">
                          {item.badge === "lock" ? (
                            <Lock className="h-3 w-3 text-emerald-500" />
                          ) : item.badge === "shield" ? (
                            <Shield className="h-3 w-3 text-emerald-500" />
                          ) : (
                            item.badge
                          )}
                        </span>
                      )}
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl",
                          item.bgColor
                        )}
                      >
                        <Icon className={cn("h-6 w-6", item.iconColor)} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{item.label}</p>
                        <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                          {item.sublabel}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <IncomeModal
        open={incomeModalOpen}
        onClose={() => handleCloseProtectedModal("income", setIncomeModalOpen)}
      />
      <BackupModal open={backupModalOpen} onClose={() => setBackupModalOpen(false)} />
      <ChangePinModal open={changePinModalOpen} onClose={() => setChangePinModalOpen(false)} />
      <BiometricSettingsModal
        open={biometricModalOpen}
        onClose={() => handleCloseProtectedModal("biometric-settings", setBiometricModalOpen)}
        settings={biometricSettings}
        updateSettings={updateBiometricSettings}
        isAvailable={isBiometricAvailable}
      />
    </div>
  );
}
