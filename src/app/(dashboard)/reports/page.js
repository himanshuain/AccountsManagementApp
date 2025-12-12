"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
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
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import useIncome from "@/hooks/useIncome";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { toast } from "sonner";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899"];

export default function ReportsPage() {
  const router = useRouter();
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

  // Refs for scrolling
  const incomeListRef = useRef(null);
  const chartsRef = useRef(null);

  // Scroll to section handler
  const scrollToSection = (ref) => {
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
    return incomeList.filter((i) => {
      const date = new Date(i.date);
      return isWithinInterval(date, {
        start: dateRange.start,
        end: dateRange.end,
      });
    });
  }, [incomeList, dateRange]);

  // Get total amount for an income entry (cash + online)
  const getIncomeTotal = (income) => {
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

      const monthIncome = incomeList.filter((i) => {
        const date = new Date(i.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const monthUdhar = udharList.filter((u) => {
        const date = new Date(u.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const dailyIncome = monthIncome
        .filter((i) => i.type === "daily")
        .reduce((sum, i) => sum + getIncomeTotal(i), 0);

      const monthlyIncome = monthIncome
        .filter((i) => i.type === "monthly")
        .reduce((sum, i) => sum + getIncomeTotal(i), 0);

      const cashIncome = monthIncome.reduce(
        (sum, i) => sum + (i.cashAmount || 0),
        0,
      );

      const onlineIncome = monthIncome.reduce(
        (sum, i) => sum + (i.onlineAmount || 0),
        0,
      );

      const udharCollected = monthUdhar
        .filter((u) => u.paymentStatus === "paid")
        .reduce(
          (sum, u) => sum + (u.cashAmount || 0) + (u.onlineAmount || 0),
          0,
        );

      const udharPending = monthUdhar
        .filter((u) => u.paymentStatus !== "paid")
        .reduce(
          (sum, u) => sum + (u.cashAmount || 0) + (u.onlineAmount || 0),
          0,
        );

      months.push({
        month: format(current, "MMM yy"),
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
    const cash = filteredIncome.reduce(
      (sum, i) => sum + (i.cashAmount || 0),
      0,
    );
    const online = filteredIncome.reduce(
      (sum, i) => sum + (i.onlineAmount || 0),
      0,
    );

    return [
      { name: "Cash", value: cash, color: "#22c55e" },
      { name: "Online", value: online, color: "#3b82f6" },
    ].filter((d) => d.value > 0);
  }, [filteredIncome]);

  // Summary stats
  const stats = useMemo(() => {
    // Total Revenue = ALL income ever added (not filtered)
    const totalRevenue = incomeList.reduce(
      (sum, i) => sum + getIncomeTotal(i),
      0,
    );
    // Filtered stats for the selected time range
    const totalIncome = filteredIncome.reduce(
      (sum, i) => sum + getIncomeTotal(i),
      0,
    );
    const totalCash = filteredIncome.reduce(
      (sum, i) => sum + (i.cashAmount || 0),
      0,
    );
    const totalOnline = filteredIncome.reduce(
      (sum, i) => sum + (i.onlineAmount || 0),
      0,
    );
    const dailyIncome = filteredIncome
      .filter((i) => i.type === "daily")
      .reduce((sum, i) => sum + getIncomeTotal(i), 0);
    const monthlyIncome = filteredIncome
      .filter((i) => i.type === "monthly")
      .reduce((sum, i) => sum + getIncomeTotal(i), 0);

    // Udhar stats
    const totalUdhar = udharList.reduce(
      (sum, u) => sum + (u.cashAmount || 0) + (u.onlineAmount || 0),
      0,
    );
    const collectedUdhar = udharList
      .filter((u) => u.paymentStatus === "paid")
      .reduce((sum, u) => sum + (u.cashAmount || 0) + (u.onlineAmount || 0), 0);
    const pendingUdhar = totalUdhar - collectedUdhar;

    // Compare with previous period
    const prevStart = subMonths(
      dateRange.start,
      timeRange === "1month"
        ? 1
        : timeRange === "3months"
          ? 3
          : timeRange === "6months"
            ? 6
            : 12,
    );
    const prevIncome = incomeList.filter((i) => {
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

  const handleEdit = (income) => {
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
  const sortedIncome = [...filteredIncome].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  // Calculate form total
  const formTotal =
    (Number(formData.cashAmount) || 0) + (Number(formData.onlineAmount) || 0);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Revenue Reports</h1>
          <p className="text-muted-foreground">
            Track your shop&apos;s income and Udhar collections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
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
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </Button>
        </div>
      </div>

      {/* Summary Cards - Clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="card-lift bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => scrollToSection(incomeListRef)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{stats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Tap to view</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="card-lift cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => scrollToSection(incomeListRef)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cash Income</p>
                <p className="text-2xl font-bold text-green-500">
                  ₹{stats.totalCash.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="card-lift cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => scrollToSection(incomeListRef)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Income</p>
                <p className="text-2xl font-bold text-blue-500">
                  ₹{stats.totalOnline.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="card-lift cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => router.push("/transactions?tab=customers")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Udhar Pending</p>
                <p className="text-2xl font-bold text-amber-500">
                  ₹{stats.pendingUdhar.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Tap to view</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div ref={chartsRef} className="grid lg:grid-cols-2 gap-6 scroll-mt-20">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Income Trend
            </CardTitle>
            <CardDescription>Cash vs Online income over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorOnline"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis
                    className="text-xs"
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`₹${value.toLocaleString()}`, ""]}
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
          </CardContent>
        </Card>

        {/* Income Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Income Distribution</CardTitle>
            <CardDescription>Cash vs Online income breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {incomeTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
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
                      formatter={(value) => [`₹${value.toLocaleString()}`, ""]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No income data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income List */}
      <Card ref={incomeListRef} className="scroll-mt-20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Income Entries</CardTitle>
            <Badge variant="secondary">{filteredIncome.length} entries</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {sortedIncome.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <IndianRupee className="h-10 w-10 mx-auto mb-2 opacity-50" />
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
              {sortedIncome.slice(0, 10).map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        income.type === "daily"
                          ? "bg-green-500/10"
                          : "bg-blue-500/10"
                      }`}
                    >
                      {income.type === "daily" ? (
                        <Banknote className="h-5 w-5 text-green-500" />
                      ) : (
                        <IndianRupee className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">
                        ₹{getIncomeTotal(income).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {income.cashAmount > 0 && (
                          <span className="flex items-center gap-1">
                            <Banknote className="h-3 w-3 text-green-500" />₹
                            {income.cashAmount.toLocaleString()}
                          </span>
                        )}
                        {income.onlineAmount > 0 && (
                          <span className="flex items-center gap-1">
                            <Smartphone className="h-3 w-3 text-blue-500" />₹
                            {income.onlineAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(income.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}{" "}
                        • {income.type === "daily" ? "Daily" : "Monthly"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {income.description && (
                      <span className="text-xs text-muted-foreground hidden sm:block max-w-[150px] truncate">
                        {income.description}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(income)}
                      disabled={!isOnline}
                    >
                      <Edit className="h-4 w-4" />
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
      </Card>

      {/* Income Form Dialog */}
      <Dialog open={incomeFormOpen} onOpenChange={setIncomeFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {incomeToEdit ? "Edit Income" : "Add Income"}
            </DialogTitle>
            <DialogDescription>
              Record your shop&apos;s daily or monthly income
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
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
                  type="number"
                  inputMode="numeric"
                  value={formData.cashAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, cashAmount: e.target.value })
                  }
                  placeholder="0"
                  className="text-lg h-12 font-semibold"
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
                  onChange={(e) =>
                    setFormData({ ...formData, onlineAmount: e.target.value })
                  }
                  placeholder="0"
                  className="text-lg h-12 font-semibold"
                />
              </div>

              {/* Total Display */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
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
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Any notes"
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setIncomeFormOpen(false)}
                className="flex-1"
              >
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
              This will permanently delete this income entry. This action cannot
              be undone.
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
