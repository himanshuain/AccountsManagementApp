"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import {
  ChevronRight,
  IndianRupee,
  BarChart3,
  Download,
  Upload,
  LogOut,
  Database,
  Wallet,
  TrendingUp,
  PiggyBank,
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
  TrendingDown,
  ImageIcon,
  Fingerprint,
  Shield,
  MoreVertical,
  Percent,
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
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { getLocalDate, getMonthOptions, getAvailableMonths } from "@/lib/date-utils";
import { CHART_DURATION_OPTIONS, INCOME_FILTER_OPTIONS, ITEMS_PER_PAGE } from "@/lib/constants";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { IncomeItem, IncomeChart, StorageInfo } from "@/components/settings";

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
  const [showGraph, setShowGraph] = useState(true);
  const [chartDuration, setChartDuration] = useState("6months");
  const [profitMargin, setProfitMargin] = useState(40);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

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
    const now = new Date();
    const income = incomeList || [];

    const calcTotal = list =>
      list.reduce((sum, i) => {
        const cash = Number(i.cashAmount) || 0;
        const online = Number(i.onlineAmount) || 0;
        return sum + (Number(i.amount) || cash + online);
      }, 0);

    const thisMonth = income.filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return {
      total: calcTotal(income),
      thisMonth: calcTotal(thisMonth),
      today: calcTotal(income.filter(i => i.date === format(now, "yyyy-MM-dd"))),
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
        <div className="px-4 pb-6">
          <h2 className="mb-6 font-heading text-2xl tracking-wide">Income Tracker</h2>

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="theme-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="amount-positive font-mono text-lg font-bold">
                ₹{totals.today.toLocaleString("en-IN")}
              </p>
              <p className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                ₹{Math.round((totals.today * profitMargin) / 100).toLocaleString("en-IN")} profit
              </p>
            </div>
            <div className="theme-card p-3 text-center">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-md font-mono font-bold text-primary">
                ₹{totals.thisMonth.toLocaleString("en-IN")}
              </p>
              <p className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                ₹{Math.round((totals.thisMonth * profitMargin) / 100).toLocaleString("en-IN")}{" "}
                profit
              </p>
            </div>
            <div className="theme-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-md font-mono font-bold">₹{totals.total.toLocaleString("en-IN")}</p>
              <p className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                ₹{Math.round((totals.total * profitMargin) / 100).toLocaleString("en-IN")} profit
              </p>
            </div>
          </div>

          {/* Revenue Chart */}
          <details className="group">
            <summary className="mb-2 cursor-pointer list-none flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
              Revenue Chart
            </summary>
            {showGraph && (
              <IncomeChart
                data={chartData}
                duration={chartDuration}
                onDurationChange={setChartDuration}
                profitMargin={profitMargin}
                onProfitMarginChange={handleProfitMarginChange}
              />
            )}
          </details>

          {/* Add Income Form */}
          <details className="group">
            <summary className="my-2 cursor-pointer list-none flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
              Add Income
            </summary>
            <div className="theme-card mb-6 mt-4 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium">Add Income</h3>
              </div>

              <div className="space-y-3">
                {/* Monthly Toggle */}
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

                {/* Cash Amount */}
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

                {/* Online Amount */}
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

                {/* Date or Month Picker */}
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
                        // Prevent future dates (iOS Safari ignores max attribute)
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

                {/* Total Preview */}
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
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Add Income
                    </>
                  )}
                </button>
              </div>
            </div>
          </details>
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

// Reports Modal Component
function ReportsModal({ open, onClose }) {
  const { transactions = [] } = useTransactions();
  const { udharList = [] } = useUdhar();
  const { incomeList = [] } = useIncome();

  usePreventBodyScroll(open);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const txns = transactions || [];
    const udhars = udharList || [];
    const income = incomeList || [];

    const totalPurchases = txns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const paidPurchases = txns
      .filter(t => t.paymentStatus === "paid" || t.paymentStatus === "partial")
      .reduce((sum, t) => sum + (Number(t.paidAmount) || 0), 0);
    const pendingPurchases = totalPurchases - paidPurchases;

    const totalUdhar = udhars.reduce((sum, u) => sum + (Number(u.amount) || 0), 0);
    const paidUdhar = udhars
      .filter(u => u.paymentStatus === "paid" || u.paymentStatus === "partial")
      .reduce((sum, u) => sum + (Number(u.paidAmount) || 0), 0);
    const pendingUdhar = totalUdhar - paidUdhar;

    const calcIncomeTotal = list =>
      list.reduce((sum, i) => {
        const cash = Number(i.cashAmount) || 0;
        const online = Number(i.onlineAmount) || 0;
        return sum + (Number(i.amount) || cash + online);
      }, 0);

    const totalIncome = calcIncomeTotal(income);
    const monthlyIncome = calcIncomeTotal(income.filter(i => new Date(i.date) >= thisMonth));

    return {
      totalPurchases,
      paidPurchases,
      pendingPurchases,
      totalUdhar,
      paidUdhar,
      pendingUdhar,
      totalIncome,
      monthlyIncome,
      netPosition: pendingUdhar - pendingPurchases,
    };
  }, [transactions, udharList, incomeList]);

  return (
    <DragCloseDrawer open={open} onOpenChange={v => !v && onClose()} height="max-h-[85vh]">
        <div className="px-4 pb-6">
          <h2 className="mb-6 font-heading text-2xl tracking-wide">Reports</h2>

          {/* <div className={cn("p-4 rounded-xl mb-6", stats.netPosition >= 0 ? "bg-emerald-500/20" : "bg-red-500/20")}>
            <p className="text-sm text-muted-foreground">Net Position</p>
            <p className={cn("text-3xl font-bold font-mono", stats.netPosition >= 0 ? "amount-positive" : "amount-negative")}>
              {stats.netPosition >= 0 ? "+" : ""}₹{Math.abs(stats.netPosition).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.netPosition >= 0 ? "Customers owe you more than you owe suppliers" : "You owe suppliers more than customers owe you"}
            </p>
          </div> */}

          <div className="theme-card mb-4 p-4">
            <div className="mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <h3 className="font-medium">Supplier Purchases</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-mono text-lg font-bold">
                  ₹{stats.totalPurchases.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="amount-positive font-mono text-lg font-bold">
                  ₹{stats.paidPurchases.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="amount-pending font-mono text-lg font-bold">
                  ₹{stats.pendingPurchases.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          <div className="theme-card mb-4 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="amount-positive h-5 w-5" />
              <h3 className="font-medium">Customer Udhar</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-mono text-lg font-bold">
                  ₹{stats.totalUdhar.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Received</p>
                <p className="amount-positive font-mono text-lg font-bold">
                  ₹{stats.paidUdhar.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="amount-pending font-mono text-lg font-bold">
                  ₹{stats.pendingUdhar.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          <div className="theme-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Income</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="font-mono text-lg font-bold text-primary">
                  ₹{stats.monthlyIncome.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-mono text-lg font-bold">
                  ₹{stats.totalIncome.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>
    </DragCloseDrawer>
  );
}

// Backup Modal Component
function BackupModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [cleanupAnalysis, setCleanupAnalysis] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const { suppliers = [] } = useSuppliers();
  const { transactions = [] } = useTransactions();
  const { customers = [] } = useCustomers();
  const { udharList = [] } = useUdhar({ fetchAll: true });

  usePreventBodyScroll(open);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/backup", { method: "POST" });
      const result = await response.json();
      if (result.success) toast.success("Backup created successfully");
      else toast.error(result.error || "Backup failed");
    } catch {
      toast.error("Backup failed");
    }
    setLoading(false);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/backup");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Export failed");
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
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `all_reports_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

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
          <h2 className="mb-6 font-heading text-2xl tracking-wide">Backup & Export</h2>

          <div className="theme-card mb-4 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Cloud Backup</h3>
                <p className="text-xs text-muted-foreground">Backup to email</p>
              </div>
            </div>
            <button
              onClick={handleBackup}
              disabled={loading}
              className="btn-hero flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}{" "}
              Send Backup to email
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
          <h2 className="mb-6 font-heading text-2xl tracking-wide">Change PIN</h2>

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
      updateSettings({ enabled: true, protectIncome: true, protectReports: true });
    } else if (key === "enabled" && settings.enabled) {
      // When disabling, disable all protections
      updateSettings({ enabled: false, protectIncome: false, protectReports: false });
    } else {
      updateSettings({ [key]: !settings[key] });
    }
  };

  return (
    <DragCloseDrawer open={open} onOpenChange={v => !v && onClose()} height="max-h-[90vh]">
        <div className="p-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-xl tracking-wide">Biometric Lock</h2>
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

                  {/* Reports */}
                  <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <span className="font-medium">Reports</span>
                    </div>
                    <button
                      onClick={() => handleToggle("protectReports")}
                      className={cn(
                        "relative h-6 w-10 rounded-full transition-colors",
                        settings.protectReports ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                          settings.protectReports ? "translate-x-5" : "translate-x-1"
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
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [changePinModalOpen, setChangePinModalOpen] = useState(false);
  const [biometricModalOpen, setBiometricModalOpen] = useState(false);
  const [showHeroBackground, setShowHeroBackground] = useState(true);

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
    const heroStored = localStorage.getItem("ui-show-hero-background");
    if (heroStored !== null) {
      setShowHeroBackground(heroStored === "true");
    }
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
    toast.success(
      theme === "dark" ? "Spider-Man Theme Activated! 🕷️" : "Iron Man Theme Activated! 🦾"
    );
  };

  const toggleHeroBackground = () => {
    const nextValue = !showHeroBackground;
    setShowHeroBackground(nextValue);
    localStorage.setItem("ui-show-hero-background", String(nextValue));
    window.dispatchEvent(new Event("hero-background-visibility-changed"));
    toast.success(nextValue ? "Hero background shown" : "Hero background hidden");
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
          icon: BarChart3,
          label: "Reports",
          sublabel: isProtected("reports") ? "Protected" : "Analytics",
          iconColor: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
          borderColor: "border-blue-500/20",
          onClick: () => handleOpenProtectedModal("reports", setReportsModalOpen),
          badge: isProtected("reports") ? "lock" : null,
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
      <div className="header-glass sticky top-0 z-20 border-b border-border px-4 py-4">
        <h1 className="font-heading text-2xl tracking-wide">Settings</h1>
      </div>

      <div className="space-y-6 px-4 py-4 pb-24">
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
                <div className="grid grid-cols-2 gap-3">
                  {/* Theme Card */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={toggleTheme}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border p-4 text-left",
                      isDark
                        ? "border-indigo-500/30 bg-gradient-to-br from-indigo-950/80 via-slate-900/60 to-violet-950/80"
                        : "border-orange-300/40 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50"
                    )}
                  >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      <AnimatePresence mode="wait">
                        {isDark ? (
                          <motion.div
                            key="dark"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                          >
                            {[...Array(5)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute h-1 w-1 rounded-full bg-white"
                                style={{
                                  top: `${15 + i * 18}%`,
                                  left: `${60 + (i % 3) * 12}%`,
                                }}
                                animate={{
                                  opacity: [0.2, 0.8, 0.2],
                                  scale: [0.8, 1.2, 0.8],
                                }}
                                transition={{
                                  duration: 2 + i * 0.4,
                                  repeat: Infinity,
                                  delay: i * 0.3,
                                }}
                              />
                            ))}
                            <motion.div
                              className="absolute right-3 top-3 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-300/30 to-violet-400/20"
                              animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                              transition={{ duration: 4, repeat: Infinity }}
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="light"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                          >
                            <motion.div
                              className="absolute right-2 top-2 h-10 w-10 rounded-full bg-gradient-to-br from-amber-300/40 to-orange-300/30"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 3, repeat: Infinity }}
                            />
                            {[...Array(4)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute bg-gradient-to-r from-amber-400/20 to-transparent"
                                style={{
                                  width: 30 + i * 8,
                                  height: 1.5,
                                  top: `${20 + i * 15}%`,
                                  right: 8,
                                  transformOrigin: "right center",
                                  rotate: -45 + i * 30,
                                }}
                                animate={{ opacity: [0.3, 0.6, 0.3], scaleX: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative z-10 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={isDark ? "moon" : "sun"}
                            initial={{ rotate: -90, scale: 0, opacity: 0 }}
                            animate={{ rotate: 0, scale: 1, opacity: 1 }}
                            exit={{ rotate: 90, scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15 }}
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-xl",
                              isDark ? "bg-indigo-500/20" : "bg-amber-400/20"
                            )}
                          >
                            {isDark ? (
                              <Moon className="h-6 w-6 text-indigo-300" />
                            ) : (
                              <Sun className="h-6 w-6 text-amber-500" />
                            )}
                          </motion.div>
                        </AnimatePresence>
                        <span className="text-lg">{isDark ? "🦾" : "🕷️"}</span>
                      </div>
                      <div>
                        <p className={cn(
                          "text-sm font-semibold",
                          isDark ? "text-indigo-100" : "text-amber-900"
                        )}>
                          Theme
                        </p>
                        <p className={cn(
                          "text-[11px]",
                          isDark ? "text-indigo-300/70" : "text-amber-700/60"
                        )}>
                          {isDark ? "Iron Man" : "Spider-Man"}
                        </p>
                      </div>
                    </div>
                  </motion.button>

                  {/* Hero Art Card */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={toggleHeroBackground}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border p-4 text-left",
                      showHeroBackground
                        ? "border-violet-500/30 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-pink-500/15"
                        : "border-border bg-muted/40"
                    )}
                  >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      <AnimatePresence>
                        {showHeroBackground && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <motion.div
                              className="absolute -right-3 bottom-0 h-16 w-16 rounded-tl-3xl bg-gradient-to-tl from-violet-500/15 to-fuchsia-500/10"
                              animate={{ scale: [1, 1.1, 1], rotate: [0, 3, 0] }}
                              transition={{ duration: 5, repeat: Infinity }}
                            />
                            <motion.div
                              className="absolute -left-2 top-6 h-10 w-10 rounded-full bg-gradient-to-br from-pink-400/15 to-violet-400/10"
                              animate={{
                                y: [0, -4, 0],
                                x: [0, 2, 0],
                              }}
                              transition={{ duration: 4, repeat: Infinity }}
                            />
                            {[...Array(3)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="absolute h-0.5 w-0.5 rounded-full bg-violet-400/60"
                                style={{
                                  top: `${25 + i * 25}%`,
                                  left: `${45 + i * 15}%`,
                                }}
                                animate={{
                                  opacity: [0, 1, 0],
                                  scale: [0.5, 1.5, 0.5],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  delay: i * 0.5,
                                }}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="relative z-10 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={showHeroBackground ? "on" : "off"}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 250, damping: 18 }}
                            className={cn(
                              "flex h-11 w-11 items-center justify-center rounded-xl",
                              showHeroBackground ? "bg-violet-500/20" : "bg-muted"
                            )}
                          >
                            {showHeroBackground ? (
                              <ImageIcon className="h-6 w-6 text-violet-500 dark:text-violet-400" />
                            ) : (
                              <EyeOff className="h-6 w-6 text-muted-foreground" />
                            )}
                          </motion.div>
                        </AnimatePresence>
                        <span
                          role="switch"
                          aria-checked={showHeroBackground}
                          onClick={e => { e.stopPropagation(); toggleHeroBackground(); }}
                        >
                          <motion.span
                            className={cn(
                              "flex h-6 w-11 items-center rounded-full px-0.5",
                              showHeroBackground ? "bg-violet-500" : "bg-muted-foreground/30"
                            )}
                            layout
                          >
                            <motion.span
                              className="h-5 w-5 rounded-full bg-white shadow-sm"
                              layout
                              animate={{ x: showHeroBackground ? 20 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </motion.span>
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Hero Art</p>
                        <p className="text-[11px] text-muted-foreground">
                          {showHeroBackground ? "Artwork visible" : "Background hidden"}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </div>
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
      <ReportsModal
        open={reportsModalOpen}
        onClose={() => handleCloseProtectedModal("reports", setReportsModalOpen)}
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
