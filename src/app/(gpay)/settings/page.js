"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  ChevronRight, IndianRupee, BarChart3, Download, Upload, 
  LogOut, Database, Wallet, TrendingUp, PiggyBank, 
  RefreshCw, Cloud, HardDrive, Lock, Pencil, Trash2, X, Check, Plus,
  Sun, Moon, FileDown, CalendarDays, Banknote, Smartphone, Eye, EyeOff,
  TrendingDown, ImageIcon
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, subYears } from "date-fns";
import { toast } from "sonner";

import { useIncome } from "@/hooks/useIncome";
import { useTransactions } from "@/hooks/useTransactions";
import { useUdhar } from "@/hooks/useUdhar";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useStorage } from "@/hooks/useStorage";
import { exportSupplierTransactionsPDF } from "@/lib/export";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

// Hook to prevent body scroll when modal is open
function usePreventBodyScroll(isOpen) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);
}

// Generate month options
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    options.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
    });
  }
  return options;
}

// Swipeable Income Item Component
function IncomeItem({ item, onEdit, onDelete }) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = false;
  };

  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    if (deltaX < 0) {
      isDragging.current = true;
      setSwipeOffset(Math.max(deltaX, -100));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset < -60) {
      setSwipeOffset(-100);
    } else {
      setSwipeOffset(0);
    }
    isDragging.current = false;
  };

  const cashAmount = Number(item.cashAmount) || 0;
  const onlineAmount = Number(item.onlineAmount) || 0;
  const totalAmount = Number(item.amount) || (cashAmount + onlineAmount);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute right-0 top-0 bottom-0 flex items-center">
        <button
          onClick={() => { setSwipeOffset(0); onEdit(item); }}
          className="h-full w-12 bg-primary flex items-center justify-center text-white"
        >
          <Pencil className="h-5 w-5" />
        </button>
        <button
          onClick={() => { setSwipeOffset(0); onDelete(item); }}
          className="h-full w-12 bg-destructive flex items-center justify-center text-white"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
      
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex items-center justify-between p-4 bg-muted rounded-xl transition-transform"
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging.current ? "none" : "transform 0.2s ease-out"
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium",
              item.type === "monthly" ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"
            )}>
              {item.type === "monthly" ? "Monthly" : "Daily"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {item.type === "monthly" 
              ? format(new Date(item.date), "MMMM yyyy")
              : format(new Date(item.date), "dd MMM yyyy")
            }
          </p>
          {(cashAmount > 0 || onlineAmount > 0) && (
            <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
              {cashAmount > 0 && <span>₹{cashAmount.toLocaleString("en-IN")} cash</span>}
              {cashAmount > 0 && onlineAmount > 0 && <span>•</span>}
              {onlineAmount > 0 && <span>₹{onlineAmount.toLocaleString("en-IN")} online</span>}
            </div>
          )}
        </div>
        <p className="amount-positive font-bold font-mono">
          +₹{totalAmount.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

// Chart Duration Options
const CHART_DURATION_OPTIONS = [
  { value: "3months", label: "3M", months: 3 },
  { value: "6months", label: "6M", months: 6 },
  { value: "12months", label: "1Y", months: 12 },
];

// Simple Bar Chart Component with dynamic height based on 10k base
function IncomeChart({ data, duration, onDurationChange }) {
  // Base value for height calculation (10k = 1 unit height)
  const BASE_VALUE = 10000;
  const CHART_HEIGHT = 140; // pixels
  
  if (!data || data.length === 0) {
    // Show empty placeholder chart
    return (
      <div className="theme-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Revenue Trend
          </h3>
          <div className="flex gap-1">
            {CHART_DURATION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => onDurationChange?.(opt.value)}
                className={cn(
                  "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  duration === opt.value 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end justify-between gap-1" style={{ height: CHART_HEIGHT }}>
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div className="w-full h-1 bg-muted rounded-t-sm" />
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">-</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">No income data yet</p>
      </div>
    );
  }

  // Calculate max units based on 10k base for better UX
  const maxValue = Math.max(...data.map(d => d.value), BASE_VALUE);
  const maxUnits = Math.ceil(maxValue / BASE_VALUE);
  const totalRevenue = data.reduce((sum, d) => sum + d.value, 0);
  
  // Calculate height for each bar based on 10k units
  const getBarHeight = (value) => {
    if (value <= 0) return 4;
    const units = value / BASE_VALUE;
    // Scale to chart height with min height of 8px
    const percentage = Math.min((units / maxUnits) * 100, 100);
    return Math.max(percentage, 5);
  };
  
  // Format value for display
  const formatValue = (value) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
    return `₹${value}`;
  };

  const durationLabel = CHART_DURATION_OPTIONS.find(o => o.value === duration)?.months || 6;

  return (
    <div className="theme-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Revenue Trend
        </h3>
        <div className="flex gap-1">
          {CHART_DURATION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onDurationChange?.(opt.value)}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                duration === opt.value 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Y-axis scale indicator */}
      <div className="flex items-center justify-end gap-2 mb-2 text-[10px] text-muted-foreground">
        <span>Max: {formatValue(maxUnits * BASE_VALUE)}</span>
      </div>
      
      <div className="flex items-end justify-between gap-1" style={{ height: CHART_HEIGHT }}>
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div className="text-[12px] text-center font-mono text-muted-foreground mb-1">
              {item.value > 0 ? formatValue(item.value) : ""}
            </div>
            <div 
              className={cn(
                "w-full rounded-t-sm transition-all duration-300",
                item.value > 0 ? "bg-gradient-to-t from-emerald-600 to-emerald-400" : "bg-muted"
              )}
              style={{ 
                height: `${getBarHeight(item.value)}%`,
                minHeight: item.value > 0 ? "8px" : "4px"
              }}
            />
            <span className="text-[9px] text-muted-foreground truncate w-full text-center font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3 text-xs">
        <span className="text-muted-foreground">{durationLabel} Month Total:</span>
        <span className="font-mono font-semibold amount-positive">{formatValue(totalRevenue)}</span>
      </div>
    </div>
  );
}

// Filter Chips
const FILTER_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "3months", label: "3 Months" },
  { value: "6months", label: "6 Months" },
  { value: "thisYear", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
];

// Income Modal Component
function IncomeModal({ open, onClose }) {
  const { incomeList = [], addIncome, updateIncome, deleteIncome } = useIncome();
  const today = new Date().toISOString().split("T")[0];
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [date, setDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [isMonthly, setIsMonthly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [filter, setFilter] = useState("all");
  const [showGraph, setShowGraph] = useState(true);
  const [chartDuration, setChartDuration] = useState("6months");
  
  const monthOptions = useMemo(() => getMonthOptions(), []);

  usePreventBodyScroll(open);

  // Filter income list
  const filteredIncomeList = useMemo(() => {
    const now = new Date();
    let startDate;
    let endDate = now;
    
    switch (filter) {
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
        return incomeList;
    }
    
    return incomeList.filter(i => {
      const d = new Date(i.date);
      return d >= startDate && d <= endDate;
    });
  }, [incomeList, filter]);

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
        return sum + (Number(item.amount) || (cash + online));
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
    
    const calcTotal = (list) => list.reduce((sum, i) => {
      const cash = Number(i.cashAmount) || 0;
      const online = Number(i.onlineAmount) || 0;
      return sum + (Number(i.amount) || (cash + online));
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
    setEditingItem(null);
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
    
    if (editingItem) {
      const result = await updateIncome(editingItem.id, incomeData);
      if (result.success) {
        toast.success("Income updated");
        resetForm();
      } else {
        toast.error(result.error || "Failed to update");
      }
    } else {
      const result = await addIncome(incomeData);
      if (result.success) {
        toast.success("Income added");
        resetForm();
      } else {
        toast.error(result.error || "Failed to add");
      }
    }
    setSubmitting(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setCashAmount(String(item.cashAmount || ""));
    setOnlineAmount(String(item.onlineAmount || ""));
    setDate(item.date);
    setSelectedMonth(item.date.substring(0, 7));
    setIsMonthly(item.type === "monthly");
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[90vh] overflow-y-auto pb-nav animate-slide-up overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center py-3 sticky top-0 bg-card z-10">
          <div className="sheet-handle" />
        </div>

        <div className="px-4 pb-6">
          <h2 className="text-2xl font-heading tracking-wide mb-6">Income Tracker</h2>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="theme-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-lg font-bold font-mono amount-positive">
                ₹{totals.today.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="theme-card p-3 text-center">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-md font-bold font-mono text-primary">
                ₹{totals.thisMonth.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="theme-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-md font-bold font-mono">
                ₹{totals.total.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Revenue Chart */}
          {showGraph && (
            <IncomeChart 
              data={chartData} 
              duration={chartDuration} 
              onDurationChange={setChartDuration} 
            />
          )}

          {/* Add/Edit Income Form */}
          <div className="theme-card p-4 mb-6 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">
                {editingItem ? "Edit Income" : "Add Income"}
              </h3>
              {editingItem && (
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {/* Monthly Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                <span className="text-sm font-medium">Monthly Income</span>
                <button
                  type="button"
                  onClick={() => setIsMonthly(!isMonthly)}
                  className={cn(
                    "relative w-12 h-6 rounded-full transition-colors",
                    isMonthly ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                    isMonthly ? "translate-x-7" : "translate-x-1"
                  )} />
                </button>
              </div>

              {/* Cash Amount */}
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Banknote className="h-3 w-3" /> Cash Amount
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="input-hero [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Online Amount */}
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Smartphone className="h-3 w-3" /> Online Amount
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={onlineAmount}
                  onChange={(e) => setOnlineAmount(e.target.value)}
                  className="input-hero [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              {/* Date or Month Picker */}
              <div>
                <label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <CalendarDays className="h-3 w-3" /> {isMonthly ? "Month" : "Date"}
                </label>
                {isMonthly ? (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="input-hero"
                  >
                    {monthOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={today}
                    className="input-hero"
                  />
                )}
              </div>

              {/* Total Preview */}
              {(Number(cashAmount) > 0 || Number(onlineAmount) > 0) && (
                <div className="p-3 bg-emerald-500/10 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold font-mono amount-positive">
                    ₹{((Number(cashAmount) || 0) + (Number(onlineAmount) || 0)).toLocaleString("en-IN")}
                  </p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={cn(
                  "w-full h-12 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2",
                  editingItem ? "btn-hero" : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                {submitting ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : editingItem ? (
                  <>
                    <Check className="h-5 w-5" />
                    Update
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Add Income
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                    filter === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {filter !== "all" && (
              <p className="text-sm text-muted-foreground mt-2">
                Filtered total: <span className="font-mono font-semibold">₹{totals.filtered.toLocaleString("en-IN")}</span>
              </p>
            )}
          </div>

          {/* Recent Income */}
          <div>
            <h3 className="font-medium mb-2">Recent Income</h3>
            <p className="text-xs text-muted-foreground mb-3">Swipe left to edit or delete</p>
            <div className="space-y-2">
              {filteredIncomeList.slice(0, 20).map(item => (
                <IncomeItem key={item.id} item={item} onEdit={handleEdit} onDelete={setDeleteItem} />
              ))}
              {filteredIncomeList.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No income recorded</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={!!deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Delete Income"
        description={deleteItem ? `Delete income of ₹${Number(deleteItem.amount || ((deleteItem.cashAmount || 0) + (deleteItem.onlineAmount || 0))).toLocaleString("en-IN")}?` : ""}
      />
    </div>
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
    const paidPurchases = txns.filter(t => t.paymentStatus === "paid").reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const pendingPurchases = totalPurchases - paidPurchases;

    const totalUdhar = udhars.reduce((sum, u) => sum + (Number(u.amount) || 0), 0);
    const paidUdhar = udhars.filter(u => u.status === "paid").reduce((sum, u) => sum + (Number(u.amount) || 0), 0);
    const pendingUdhar = totalUdhar - paidUdhar;

    const calcIncomeTotal = (list) => list.reduce((sum, i) => {
      const cash = Number(i.cashAmount) || 0;
      const online = Number(i.onlineAmount) || 0;
      return sum + (Number(i.amount) || (cash + online));
    }, 0);

    const totalIncome = calcIncomeTotal(income);
    const monthlyIncome = calcIncomeTotal(income.filter(i => new Date(i.date) >= thisMonth));

    return {
      totalPurchases, paidPurchases, pendingPurchases,
      totalUdhar, paidUdhar, pendingUdhar,
      totalIncome, monthlyIncome,
      netPosition: pendingUdhar - pendingPurchases,
    };
  }, [transactions, udharList, incomeList]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto pb-nav animate-slide-up overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center py-3 sticky top-0 bg-card z-10">
          <div className="sheet-handle" />
        </div>

        <div className="px-4 pb-6">
          <h2 className="text-2xl font-heading tracking-wide mb-6">Reports</h2>

          {/* <div className={cn("p-4 rounded-xl mb-6", stats.netPosition >= 0 ? "bg-emerald-500/20" : "bg-red-500/20")}>
            <p className="text-sm text-muted-foreground">Net Position</p>
            <p className={cn("text-3xl font-bold font-mono", stats.netPosition >= 0 ? "amount-positive" : "amount-negative")}>
              {stats.netPosition >= 0 ? "+" : ""}₹{Math.abs(stats.netPosition).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.netPosition >= 0 ? "Customers owe you more than you owe suppliers" : "You owe suppliers more than customers owe you"}
            </p>
          </div> */}

          <div className="theme-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-destructive" />
              <h3 className="font-medium">Supplier Purchases</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold font-mono">₹{stats.totalPurchases.toLocaleString("en-IN")}</p></div>
              <div><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-bold font-mono amount-positive">₹{stats.paidPurchases.toLocaleString("en-IN")}</p></div>
              <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold font-mono amount-pending">₹{stats.pendingPurchases.toLocaleString("en-IN")}</p></div>
            </div>
          </div>

          <div className="theme-card p-4 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 amount-positive" />
              <h3 className="font-medium">Customer Udhar</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold font-mono">₹{stats.totalUdhar.toLocaleString("en-IN")}</p></div>
              <div><p className="text-xs text-muted-foreground">Received</p><p className="text-lg font-bold font-mono amount-positive">₹{stats.paidUdhar.toLocaleString("en-IN")}</p></div>
              <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold font-mono amount-pending">₹{stats.pendingUdhar.toLocaleString("en-IN")}</p></div>
            </div>
          </div>

          <div className="theme-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <PiggyBank className="h-5 w-5 text-primary" />
              <h3 className="font-medium">Income</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-muted-foreground">This Month</p><p className="text-lg font-bold font-mono text-primary">₹{stats.monthlyIncome.toLocaleString("en-IN")}</p></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold font-mono">₹{stats.totalIncome.toLocaleString("en-IN")}</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Backup Modal Component
function BackupModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const { suppliers = [] } = useSuppliers();
  const { transactions = [] } = useTransactions();

  usePreventBodyScroll(open);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/backup", { method: "POST" });
      const result = await response.json();
      if (result.success) toast.success("Backup created successfully");
      else toast.error(result.error || "Backup failed");
    } catch { toast.error("Backup failed"); }
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
    } catch { toast.error("Export failed"); }
    setLoading(false);
  };

  const handleExportAllPDF = () => {
    let exported = 0;
    suppliers.forEach(supplier => {
      const supplierTxns = transactions.filter(t => t.supplierId === supplier.id);
      if (supplierTxns.length > 0) {
        try { exportSupplierTransactionsPDF(supplier, supplierTxns); exported++; } 
        catch (e) { console.error("PDF export failed for", supplier.name, e); }
      }
    });
    if (exported > 0) toast.success(`Exported ${exported} PDF reports`);
    else toast.error("No suppliers with transactions to export");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto pb-nav animate-slide-up overscroll-contain" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center py-3 sticky top-0 bg-card z-10"><div className="sheet-handle" /></div>
        <div className="px-4 pb-6">
          <h2 className="text-2xl font-heading tracking-wide mb-6">Backup & Export</h2>

          <div className="theme-card p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center"><Cloud className="h-6 w-6 text-primary" /></div>
              <div><h3 className="font-medium">Cloud Backup</h3><p className="text-xs text-muted-foreground">Backup to email (automatic daily)</p></div>
            </div>
            <button onClick={handleBackup} disabled={loading} className="w-full btn-hero disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />} Backup Now
            </button>
          </div>

          <div className="theme-card p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center"><HardDrive className="h-6 w-6 text-emerald-500" /></div>
              <div><h3 className="font-medium">Local Export</h3><p className="text-xs text-muted-foreground">Download backup file to device</p></div>
            </div>
            <button onClick={handleExport} disabled={loading} className="w-full h-12 bg-muted rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-accent transition-colors">
              <Download className="h-5 w-5" /> Export Data
            </button>
          </div>

          <div className="theme-card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center"><FileDown className="h-6 w-6 text-red-500" /></div>
              <div><h3 className="font-medium">Export All PDFs</h3><p className="text-xs text-muted-foreground">Export all supplier transaction reports</p></div>
            </div>
            <button onClick={handleExportAllPDF} disabled={loading} className="w-full h-12 bg-muted rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-accent transition-colors">
              <FileDown className="h-5 w-5" /> Export All PDFs
            </button>
          </div>
        </div>
      </div>
    </div>
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl pb-nav animate-slide-up overscroll-contain" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center py-3"><div className="sheet-handle" /></div>
        <div className="px-4 pb-6">
          <h2 className="text-2xl font-heading tracking-wide mb-6">Change PIN</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Current PIN</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="Enter current PIN"
                  className="input-hero pr-12"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-2">New PIN</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Enter new PIN"
                  className="input-hero pr-12"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-2">Confirm New PIN</label>
              <input
                type={showNew ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm new PIN"
                className="input-hero"
              />
            </div>

            <button onClick={handleSubmit} disabled={loading} className="w-full btn-hero disabled:opacity-50 flex items-center justify-center gap-2 mt-6">
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              Change PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Storage Info Component
function StorageInfo() {
  const { storageInfo, loading, error } = useStorage();

  if (loading) {
    return (
      <div className="theme-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse mt-1" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !storageInfo) {
    return (
      <div className="theme-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Database className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Storage</h3>
            <p className="text-xs text-muted-foreground">Unable to load storage info</p>
          </div>
        </div>
      </div>
    );
  }

  const usedPercent = storageInfo.usedPercentage || 0;

  return (
    <div className="theme-card p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Database className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">Storage (R2)</h3>
          <p className="text-xs text-muted-foreground">
            {storageInfo.usedFormatted} of {storageInfo.totalFormatted} used
          </p>
        </div>
        <span className="text-sm font-mono">{usedPercent.toFixed(1)}%</span>
      </div>
      
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all",
            usedPercent > 90 ? "bg-red-500" : usedPercent > 70 ? "bg-amber-500" : "bg-blue-500"
          )}
          style={{ width: `${Math.min(usedPercent, 100)}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          {storageInfo.fileCount || 0} images
        </span>
        <span>{storageInfo.remainingFormatted} remaining</span>
      </div>
    </div>
  );
}

// Main Settings Page
export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [changePinModalOpen, setChangePinModalOpen] = useState(false);

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
    toast.success(theme === "dark" ? "Spider-Man Theme Activated! 🕷️" : "Iron Man Theme Activated! 🦾");
  };

  const menuItems = [
    {
      section: "Appearance",
      items: [
        {
          icon: theme === "dark" ? Moon : Sun,
          label: "Theme",
          sublabel: theme === "dark" ? "Iron Man (Dark)" : "Spider-Man (Light)",
          color: theme === "dark" ? "text-amber-400" : "text-red-500",
          bgColor: theme === "dark" ? "bg-amber-500/20" : "bg-red-500/20",
          onClick: toggleTheme,
          rightContent: <span className="text-xs text-muted-foreground">{theme === "dark" ? "🦾" : "🕷️"}</span>,
        },
      ],
    },
    {
      section: "Business",
      items: [
        { icon: IndianRupee, label: "Income Tracker", sublabel: "Track daily & monthly income", color: "amount-positive", bgColor: "bg-emerald-500/20", onClick: () => setIncomeModalOpen(true) },
        { icon: BarChart3, label: "Reports", sublabel: "View analytics & insights", color: "text-primary", bgColor: "bg-primary/20", onClick: () => setReportsModalOpen(true) },
        { icon: Database, label: "Backup & Export", sublabel: "Manage your data & PDFs", color: "status-pending", bgColor: "bg-amber-500/20", onClick: () => setBackupModalOpen(true) },
      ],
    },
    {
      section: "Account",
      items: [
        { icon: Lock, label: "Change PIN", sublabel: "Update your security PIN", color: "text-muted-foreground", bgColor: "bg-muted", onClick: () => setChangePinModalOpen(true) },
        { icon: LogOut, label: "Logout", sublabel: "Sign out of your account", color: "text-destructive", bgColor: "bg-destructive/20", onClick: handleLogout },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background px-4 py-4 border-b border-border">
        <h1 className="text-2xl font-heading tracking-wide">Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-6 pb-24">
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Storage</h2>
          <StorageInfo />
        </div>

        {menuItems.map((section) => (
          <div key={section.section}>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">{section.section}</h2>
            <div className="theme-card overflow-hidden divide-y divide-border">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.label} onClick={item.onClick} className="w-full text-left hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-3 p-4">
                      <div className={`h-10 w-10 rounded-full ${item.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                      </div>
                      {item.rightContent || <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <IncomeModal open={incomeModalOpen} onClose={() => setIncomeModalOpen(false)} />
      <ReportsModal open={reportsModalOpen} onClose={() => setReportsModalOpen(false)} />
      <BackupModal open={backupModalOpen} onClose={() => setBackupModalOpen(false)} />
      <ChangePinModal open={changePinModalOpen} onClose={() => setChangePinModalOpen(false)} />
    </div>
  );
}
