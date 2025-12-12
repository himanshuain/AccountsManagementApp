"use client";

import { useState, useMemo } from "react";
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
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart,
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
  TrendingDown,
  Users,
  Receipt,
  IndianRupee,
  Calendar,
  Download,
  PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";

const COLORS = [
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

export default function ReportsPage() {
  const { suppliers } = useSuppliers();
  const { transactions } = useTransactions();
  const [timeRange, setTimeRange] = useState("6months");

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

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const date = new Date(t.date);
      return isWithinInterval(date, {
        start: dateRange.start,
        end: dateRange.end,
      });
    });
  }, [transactions, dateRange]);

  // Monthly transaction data for chart
  const monthlyData = useMemo(() => {
    const months = [];
    let current = new Date(dateRange.start);

    while (current <= dateRange.end) {
      const monthStart = startOfMonth(current);
      const monthEnd = endOfMonth(current);

      const monthTransactions = transactions.filter((t) => {
        const date = new Date(t.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const totalAmount = monthTransactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0,
      );
      const paidAmount = monthTransactions
        .filter((t) => t.paymentStatus === "paid")
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const pendingAmount = totalAmount - paidAmount;

      months.push({
        month: format(current, "MMM yy"),
        total: totalAmount,
        paid: paidAmount,
        pending: pendingAmount,
        count: monthTransactions.length,
      });

      current = subMonths(current, -1);
    }

    return months;
  }, [transactions, dateRange]);

  // Payment status distribution
  const paymentStatusData = useMemo(() => {
    const paid = filteredTransactions.filter(
      (t) => t.paymentStatus === "paid",
    ).length;
    const pending = filteredTransactions.filter(
      (t) => t.paymentStatus === "pending",
    ).length;
    const partial = filteredTransactions.filter(
      (t) => t.paymentStatus === "partial",
    ).length;

    return [
      { name: "Paid", value: paid, color: "#22c55e" },
      { name: "Pending", value: pending, color: "#f59e0b" },
      { name: "Partial", value: partial, color: "#3b82f6" },
    ].filter((d) => d.value > 0);
  }, [filteredTransactions]);

  // Top suppliers by amount
  const topSuppliers = useMemo(() => {
    const supplierTotals = {};

    filteredTransactions.forEach((t) => {
      if (!supplierTotals[t.supplierId]) {
        const supplier = suppliers.find((s) => s.id === t.supplierId);
        supplierTotals[t.supplierId] = {
          name: supplier?.name || "Unknown",
          amount: 0,
          count: 0,
        };
      }
      supplierTotals[t.supplierId].amount += t.amount || 0;
      supplierTotals[t.supplierId].count += 1;
    });

    return Object.values(supplierTotals)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions, suppliers]);

  // Summary stats
  const stats = useMemo(() => {
    const totalAmount = filteredTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    const paidAmount = filteredTransactions
      .filter((t) => t.paymentStatus === "paid")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const pendingAmount = totalAmount - paidAmount;

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
    const prevTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return isWithinInterval(date, { start: prevStart, end: dateRange.start });
    });
    const prevTotal = prevTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );
    const changePercent = prevTotal
      ? (((totalAmount - prevTotal) / prevTotal) * 100).toFixed(1)
      : 0;

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      transactionCount: filteredTransactions.length,
      changePercent: Number(changePercent),
      avgTransaction: filteredTransactions.length
        ? totalAmount / filteredTransactions.length
        : 0,
    };
  }, [filteredTransactions, transactions, dateRange, timeRange]);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Insights into your business performance
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ₹{stats.totalAmount.toLocaleString()}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${stats.changePercent >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {stats.changePercent >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(stats.changePercent)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-500">
                  ₹{stats.paidAmount.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-500">
                  ₹{stats.pendingAmount.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-lift">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Avg. Transaction
                </p>
                <p className="text-2xl font-bold">
                  ₹{Math.round(stats.avgTransaction).toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Transactions
            </CardTitle>
            <CardDescription>Revenue trend over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
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
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#f97316"
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                    name="Total"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Payment Status
            </CardTitle>
            <CardDescription>Distribution of payment statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {paymentStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No transaction data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Suppliers
            </CardTitle>
            <CardDescription>By transaction amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {topSuppliers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSuppliers} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      className="text-xs"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [
                        `₹${value.toLocaleString()}`,
                        "Amount",
                      ]}
                    />
                    <Bar
                      dataKey="amount"
                      fill="#f97316"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No supplier data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Paid vs Pending Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Paid vs Pending
            </CardTitle>
            <CardDescription>Monthly comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
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
                  <Bar
                    dataKey="paid"
                    name="Paid"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="pending"
                    name="Pending"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
