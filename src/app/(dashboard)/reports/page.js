"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  TrendingUp,
  Calendar,
  Plus,
  Trash2,
  Edit,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Smartphone,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import useIncome from "@/hooks/useIncome";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { toast } from "sonner";
import { cn, getAmountTextSize } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899"];

// Custom Y-axis formatter: show in thousands till 1 lac, then 50k gaps
const formatYAxis = value => {
  if (value === 0) return "₹0";
  if (value < 100000) {
    return `₹${(value / 1000).toFixed(0)}k`;
  }
  // For 1 lac and above, show in lakhs
  return `₹${(value / 100000).toFixed(1)}L`;
};

// Generate Y-axis ticks
const getYAxisTicks = maxValue => {
  if (maxValue <= 0) return [0];

  const ticks = [0];

  if (maxValue <= 100000) {
    // Show in 10k increments up to 1 lac
    const increment = maxValue <= 50000 ? 10000 : 20000;
    for (let i = increment; i <= maxValue * 1.1; i += increment) {
      ticks.push(i);
    }
  } else {
    // Show in 50k increments above 1 lac
    for (let i = 50000; i <= maxValue * 1.1; i += 50000) {
      ticks.push(i);
    }
  }

  return ticks;
};

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();
  const {
    incomeList,
    loading: incomeLoading,
    addIncome,
    updateIncome,
    deleteIncome,
    getTotalIncome,
  } = useIncome();
  const { udharList } = useUdhar();
  const [timeRange, setTimeRange] = useState("6months");
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [incomeListExpanded, setIncomeListExpanded] = useState(true);
  const [monthlyListExpanded, setMonthlyListExpanded] = useState(false);
  const [chartsExpanded, setChartsExpanded] = useState(false);

  // Refs for scrolling and input focus
  const incomeListRef = useRef(null);
  const chartsRef = useRef(null);
  const cashInputRef = useRef(null);

  // Auto-focus cash input when income form opens
  useEffect(() => {
    if (incomeFormOpen && cashInputRef.current) {
      setTimeout(() => {
        cashInputRef.current?.focus();
      }, 500);
    }
  }, [incomeFormOpen]);

  // Handle URL params for scrolling and expanding sections (e.g., from dashboard)
  useEffect(() => {
    const scrollTo = searchParams.get("scrollTo");
    const expandIncome = searchParams.get("expandIncome");
    const expandMonthly = searchParams.get("expandMonthly");
    
    if (scrollTo || expandIncome || expandMonthly) {
      // Expand relevant sections
      if (expandIncome === "true") {
        setIncomeListExpanded(true);
      }
      if (expandMonthly === "true") {
        setMonthlyListExpanded(true);
      }
      
      // Scroll to relevant section after a short delay to allow expansion
      setTimeout(() => {
        if (scrollTo === "income" && incomeListRef.current) {
          incomeListRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (scrollTo === "monthly" && incomeListRef.current) {
          // Scroll to income list which contains both daily and monthly entries
          incomeListRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        
        // Clear the query parameters from URL without triggering a navigation
        router.replace("/reports", { scroll: false });
      }, 300);
    }
  }, [searchParams, router]);

  // Scroll to section handler
  const scrollToSection = ref => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Income form state - with cash and online amounts
  const [formData, setFormData] = useState({
    type: "daily",
    cashAmount: "",
    onlineAmount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  // Calculate date range
  const dateRange = useMemo(() => {
    const end = new Date();
    let start;
    switch (timeRange) {
      case "1month":
        start = subMonths(end, 1);
        break;
      case "3months":
        start = subMonths(end, 3);
        break;
      case "6months":
        start = subMonths(end, 6);
        break;
      case "1year":
        start = subMonths(end, 12);
        break;
      default:
        start = subMonths(end, 6);
    }
    return { start, end };
  }, [timeRange]);

  // Filter income by date range
  const filteredIncome = useMemo(() => {
    return incomeList.filter(i => {
      const date = new Date(i.date);
      return isWithinInterval(date, {
        start: dateRange.start,
        end: dateRange.end,
      });
    });
  }, [incomeList, dateRange]);

  // Get total amount for an income entry (cash + online)
  const getIncomeTotal = income => {
    // Use cashAmount + onlineAmount if available, otherwise fall back to amount
    const cash = income.cashAmount || 0;
    const online = income.onlineAmount || 0;
    // If both are 0, use the legacy amount field
    if (cash === 0 && online === 0) {
      return income.amount || 0;
    }
    return cash + online;
  };

  // Monthly income data for chart
  const monthlyData = useMemo(() => {
    const months = [];
    let current = new Date(dateRange.start);

    while (current <= dateRange.end) {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);

      const monthIncome = incomeList.filter(i => {
        const date = new Date(i.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const monthUdhar = udharList.filter(u => {
        const date = new Date(u.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const dailyIncome = monthIncome
        .filter(i => i.type === "daily")
        .reduce((sum, i) => sum + getIncomeTotal(i), 0);

      const monthlyIncome = monthIncome
        .filter(i => i.type === "monthly")
        .reduce((sum, i) => sum + getIncomeTotal(i), 0);

      const cashIncome = monthIncome.reduce((sum, i) => sum + (i.cashAmount || 0), 0);

      const onlineIncome = monthIncome.reduce((sum, i) => sum + (i.onlineAmount || 0), 0);

      // Helper functions for udhar amounts
      const getTotal = u => u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0);
      const getPaid = u => u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0);

      const udharCollected = monthUdhar.reduce((sum, u) => sum + getPaid(u), 0);

      const udharPending = monthUdhar.reduce((sum, u) => {
        const total = getTotal(u);
        const paid = getPaid(u);
        return sum + Math.max(0, total - paid);
      }, 0);

      months.push({
        month: format(current, "MMM"),
        monthRange: `1 - ${format(monthEnd, "d")} ${format(current, "MMM")}`,
        daily: dailyIncome,
        monthly: monthlyIncome,
        cash: cashIncome,
        online: onlineIncome,
        total: dailyIncome + monthlyIncome,
        udharCollected,
        udharPending,
      });

      current = subMonths(current, -1);
    }

    return months;
  }, [incomeList, udharList, dateRange]);

  // Income type distribution
  const incomeTypeData = useMemo(() => {
    const cash = filteredIncome.reduce((sum, i) => sum + (i.cashAmount || 0), 0);
    const online = filteredIncome.reduce((sum, i) => sum + (i.onlineAmount || 0), 0);

    return [
      { name: "Cash", value: cash, color: "#22c55e" },
      { name: "Online", value: online, color: "#3b82f6" },
    ].filter(d => d.value > 0);
  }, [filteredIncome]);

  // Summary stats
  const stats = useMemo(() => {
    // Total Revenue = ALL income ever added (not filtered)
    const totalRevenue = incomeList.reduce((sum, i) => sum + getIncomeTotal(i), 0);
    // Filtered stats for the selected time range
    const totalIncome = filteredIncome.reduce((sum, i) => sum + getIncomeTotal(i), 0);
    const totalCash = filteredIncome.reduce((sum, i) => sum + (i.cashAmount || 0), 0);
    const totalOnline = filteredIncome.reduce((sum, i) => sum + (i.onlineAmount || 0), 0);
    const dailyIncome = filteredIncome
      .filter(i => i.type === "daily")
      .reduce((sum, i) => sum + getIncomeTotal(i), 0);
    const monthlyIncome = filteredIncome
      .filter(i => i.type === "monthly")
      .reduce((sum, i) => sum + getIncomeTotal(i), 0);

    // Udhar stats - support both old (cashAmount + onlineAmount) and new (amount) format
    const getUdharTotal = u => u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0);
    const getUdharPaid = u => u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0);

    const totalUdhar = udharList.reduce((sum, u) => sum + getUdharTotal(u), 0);
    const collectedUdhar = udharList.reduce((sum, u) => sum + getUdharPaid(u), 0);
    const pendingUdhar = udharList.reduce((sum, u) => {
      const total = getUdharTotal(u);
      const paid = getUdharPaid(u);
      return sum + Math.max(0, total - paid);
    }, 0);

    // Compare with previous period
    const prevStart = subMonths(
      dateRange.start,
      timeRange === "1month" ? 1 : timeRange === "3months" ? 3 : timeRange === "6months" ? 6 : 12
    );
    const prevIncome = incomeList.filter(i => {
      const date = new Date(i.date);
      return isWithinInterval(date, { start: prevStart, end: dateRange.start });
    });
    const prevTotal = prevIncome.reduce((sum, i) => sum + getIncomeTotal(i), 0);
    const changePercent = prevTotal
      ? (((totalIncome - prevTotal) / prevTotal) * 100).toFixed(1)
      : 0;

    return {
      totalRevenue,
      totalIncome,
      totalCash,
      totalOnline,
      dailyIncome,
      monthlyIncome,
      totalUdhar,
      collectedUdhar,
      pendingUdhar,
      incomeCount: filteredIncome.length,
      changePercent: Number(changePercent),
    };
  }, [filteredIncome, incomeList, udharList, dateRange, timeRange]);

  // Handle form submission
  const handleSubmit = async () => {
    const cashAmt = Number(formData.cashAmount) || 0;
    const onlineAmt = Number(formData.onlineAmount) || 0;
    const totalAmt = cashAmt + onlineAmt;

    if (totalAmt <= 0) {
      toast.error("Please enter at least one amount (cash or online)");
      return;
    }

    const incomeData = {
      type: formData.type,
      cashAmount: cashAmt,
      onlineAmount: onlineAmt,
      amount: totalAmt, // Keep total for backward compatibility
      date: formData.date,
      description: formData.description,
    };

    if (incomeToEdit) {
      const result = await updateIncome(incomeToEdit.id, incomeData);
      if (result.success) {
        toast.success("Income updated");
      } else {
        toast.error("Failed to update");
      }
    } else {
      const result = await addIncome(incomeData);
      if (result.success) {
        toast.success("Income added");
      } else {
        toast.error("Failed to add");
      }
    }

    setIncomeFormOpen(false);
    setIncomeToEdit(null);
    setFormData({
      type: "daily",
      cashAmount: "",
      onlineAmount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
    });
  };

  const handleEdit = income => {
    setIncomeToEdit(income);
    setFormData({
      type: income.type || "daily",
      cashAmount: income.cashAmount?.toString() || "",
      onlineAmount: income.onlineAmount?.toString() || "",
      date: income.date || new Date().toISOString().split("T")[0],
      description: income.description || "",
    });
    setIncomeFormOpen(true);
  };

  const handleDelete = async () => {
    if (incomeToDelete) {
      const result = await deleteIncome(incomeToDelete.id);
      if (result.success) {
        toast.success("Income deleted");
      } else {
        toast.error("Failed to delete");
      }
    }
    setDeleteDialogOpen(false);
    setIncomeToDelete(null);
  };

  const openAddForm = () => {
    if (!isOnline) {
      toast.error("Cannot add while offline");
      return;
    }
    setIncomeToEdit(null);
    setFormData({
      type: "daily",
      cashAmount: "",
      onlineAmount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
    });
    setIncomeFormOpen(true);
  };

  // Sort income by date (newest first)
  const sortedIncome = [...filteredIncome].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate form total
  const formTotal = (Number(formData.cashAmount) || 0) + (Number(formData.onlineAmount) || 0);

  // Loading state
  if (incomeLoading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>

        {/* List skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revenue Reports</h1>
          <p className="text-muted-foreground">
            Track your shop&apos;s income and Udhar collections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openAddForm} disabled={!isOnline}>
            <Plus className="mr-2 h-4 w-4" />
            Add Income
          </Button>
        </div>
      </div>

      {/* Summary Cards - Redesigned */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Total Revenue Card - Combined with Cash & Online */}
        <Card
          className="card-lift cursor-pointer border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent transition-transform hover:scale-[1.01]"
          onClick={() => scrollToSection(incomeListRef)}
        >
          <CardContent className="p-5">
            {/* Main Total */}
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm text-muted-foreground">Total Revenue</p>
                <p
                  className={cn(
                    "font-bold text-primary",
                    getAmountTextSize(stats.totalRevenue, "3xl")
                  )}
                >
                  ₹{stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <IndianRupee className="h-7 w-7 text-primary" />
              </div>
            </div>

            {/* Cash & Online Breakdown */}
            <div className="grid grid-cols-2 gap-3 border-t border-primary/10 pt-3">
              <div className="flex items-center gap-3 rounded-lg bg-green-500/5 p-2">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                  <Banknote className="h-4 w-4 text-green-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Cash</p>
                  <p className="truncate font-semibold text-green-600">
                    ₹{stats.totalCash.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-blue-500/5 p-2">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Smartphone className="h-4 w-4 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Online</p>
                  <p className="truncate font-semibold text-blue-600">
                    ₹{stats.totalOnline.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Tap to view income entries
            </p>
          </CardContent>
        </Card>

        {/* Udhar Pending Card */}
        <Card
          className="card-lift cursor-pointer border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent transition-transform hover:scale-[1.01]"
          onClick={() => router.push("/customers")}
        >
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm text-muted-foreground">Udhar Pending</p>
                <p
                  className={cn(
                    "font-bold text-amber-600",
                    getAmountTextSize(stats.pendingUdhar, "3xl")
                  )}
                >
                  ₹{stats.pendingUdhar.toLocaleString()}
                </p>
              </div>
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/10">
                <TrendingUp className="h-7 w-7 text-amber-500" />
              </div>
            </div>

            {/* Udhar Stats */}
            <div className="grid grid-cols-2 gap-3 border-t border-amber-500/10 pt-3">
              <div className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">Total Udhar</p>
                <p className="truncate font-semibold">₹{stats.totalUdhar.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-green-500/5 p-2">
                <p className="text-xs text-green-600">Collected</p>
                <p className="truncate font-semibold text-green-600">
                  ₹{stats.collectedUdhar.toLocaleString()}
                </p>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-muted-foreground">Tap to view customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Income List - Collapsible (moved above Monthly) */}
      <Collapsible open={incomeListExpanded} onOpenChange={setIncomeListExpanded}>
        <Card ref={incomeListRef} className="scroll-mt-20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer transition-colors hover:bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Income Entries</CardTitle>
                  <Badge variant="secondary">{filteredIncome.length} entries</Badge>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${incomeListExpanded ? "rotate-180" : ""}`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {sortedIncome.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <IndianRupee className="mx-auto mb-2 h-10 w-10 opacity-50" />
                  <p>No income entries yet</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={openAddForm}
                    disabled={!isOnline}
                  >
                    Add your first income
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedIncome.slice(0, 10).map(income => (
                    <div
                      key={income.id}
                      className="flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            income.type === "daily" ? "bg-green-500/10" : "bg-blue-500/10"
                          }`}
                        >
                          {income.type === "daily" ? (
                            <Banknote className="h-5 w-5 text-green-500" />
                          ) : (
                            <IndianRupee className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <p className="pb-2 text-2xl font-bold text-green-600">
                            ₹{getIncomeTotal(income).toLocaleString()}
                          </p>
                          <div className="flex flex-col gap-0.5 text-xs">
                            {income.cashAmount > 0 && (
                              <span className="flex items-center gap-1.5 text-green-300">
                                <Banknote className="h-3 w-3" />
                                <span className="text-base font-medium">
                                  ₹{income.cashAmount.toLocaleString()}
                                </span>
                                <span className="text-muted-foreground">Cash</span>
                              </span>
                            )}
                            {income.onlineAmount > 0 && (
                              <span className="flex items-center gap-1.5 text-blue-400">
                                <Smartphone className="h-3 w-3" />
                                <span className="text-base font-medium">
                                  ₹{income.onlineAmount.toLocaleString()}
                                </span>
                                <span className="text-muted-foreground">Online</span>
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {format(new Date(income.date), "dd MMM yyyy")} •{" "}
                            {income.type === "daily" ? "Daily" : "Monthly"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {income.description && (
                          <span className="hidden max-w-[150px] truncate text-xs text-muted-foreground sm:block">
                            {income.description}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-20 text-xs"
                          onClick={() => handleEdit(income)}
                          disabled={!isOnline}
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (!isOnline) {
                              toast.error("Cannot delete while offline");
                              return;
                            }
                            setIncomeToDelete(income);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={!isOnline}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Monthly Breakdown - Collapsible */}
      <Collapsible open={monthlyListExpanded} onOpenChange={setMonthlyListExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer transition-colors hover:bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Monthly Breakdown
                  </CardTitle>
                  <CardDescription>View cash, online & Udhar by month</CardDescription>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${monthlyListExpanded ? "rotate-180" : ""}`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {monthlyData
                  .slice()
                  .reverse()
                  .map((month, idx) => (
                    <div key={idx} className="rounded-lg border bg-muted/30 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold">{month.month}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({month.monthRange})
                          </span>
                        </div>
                        <span className="text-lg font-bold">₹{month.total.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col gap-1.5 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                          <span className="text-muted-foreground">Cash:</span>
                          <span className="font-medium text-green-600">
                            ₹{month.cash.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                          <span className="text-muted-foreground">Online:</span>
                          <span className="font-medium text-blue-600">
                            ₹{month.online.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
                          <span className="text-muted-foreground">Udhar:</span>
                          <span className="font-medium text-amber-600">
                            ₹{month.udharPending.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Charts - Collapsible */}
      <Collapsible open={chartsExpanded} onOpenChange={setChartsExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer transition-colors hover:bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Income Charts
                  </CardTitle>
                  <CardDescription>Visualize your income trends</CardDescription>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${chartsExpanded ? "rotate-180" : ""}`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div ref={chartsRef} className="grid scroll-mt-20 gap-6 lg:grid-cols-2">
                {/* Monthly Trend */}
                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 font-medium">Cash vs Online Trend</h4>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={formatYAxis} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={value => [`₹${value.toLocaleString()}`, ""]}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="cash"
                          stroke="#22c55e"
                          fillOpacity={1}
                          fill="url(#colorCash)"
                          name="Cash"
                        />
                        <Area
                          type="monotone"
                          dataKey="online"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorOnline)"
                          name="Online"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Income Distribution */}
                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 font-medium">Income Distribution</h4>
                  <div className="h-[250px]">
                    {incomeTypeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={incomeTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {incomeTypeData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={value => [`₹${value.toLocaleString()}`, ""]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        No income data
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Income Form Dialog */}
      <Dialog open={incomeFormOpen} onOpenChange={setIncomeFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{incomeToEdit ? "Edit Income" : "Add Income"}</DialogTitle>
            <DialogDescription>Record your shop&apos;s daily or monthly income</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={v => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Income</SelectItem>
                  <SelectItem value="monthly">Monthly Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cash and Online Amount Inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-500" />
                  Cash Amount (₹)
                </Label>
                <Input
                  ref={cashInputRef}
                  type="number"
                  inputMode="numeric"
                  value={formData.cashAmount}
                  onChange={e => setFormData({ ...formData, cashAmount: e.target.value })}
                  placeholder="0"
                  className="h-12 text-lg font-semibold"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-500" />
                  Online Amount (₹)
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={formData.onlineAmount}
                  onChange={e => setFormData({ ...formData, onlineAmount: e.target.value })}
                  placeholder="0"
                  className="h-12 text-lg font-semibold"
                />
              </div>

              {/* Total Display */}
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Amount</span>
                  <span className="text-xl font-bold text-primary">
                    ₹{formTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Any notes"
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full gap-3">
              <Button variant="outline" onClick={() => setIncomeFormOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {incomeToEdit ? "Update" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this income entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
