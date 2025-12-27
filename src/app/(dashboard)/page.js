/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  IndianRupee,
  Plus,
  Store,
  Banknote,
  Smartphone,
  UserPlus,
  X,
  Check,
  Camera,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useIncome from "@/hooks/useIncome";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { TransactionForm } from "@/components/TransactionForm";
import { UdharForm } from "@/components/UdharForm";
import { CustomerForm } from "@/components/CustomerForm";
import { SupplierForm } from "@/components/SupplierForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { haptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { suppliers, addSupplier } = useSuppliers();
  const { transactions } = useTransactions();
  const { customers, addCustomer } = useCustomers();
  const { udharList, addUdhar } = useUdhar();
  const { incomeList, addIncome } = useIncome();
  const { addTransaction } = useTransactions();

  // Form states
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [initialUdharAmount, setInitialUdharAmount] = useState("");

  // Image data to pass to forms
  const [udharInitialData, setUdharInitialData] = useState(null);
  const [transactionInitialImages, setTransactionInitialImages] = useState([]);

  // Floating action button state
  const [fabOpen, setFabOpen] = useState(false);

  // Camera capture state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const cameraInputRef = useRef(null);

  // For auto-opening dropdowns
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // Income form data
  const [incomeFormData, setIncomeFormData] = useState({
    type: "daily",
    cashAmount: "",
    onlineAmount: "",
    date: new Date().toISOString().split("T")[0],
    month: new Date().toISOString().slice(0, 7),
    description: "",
  });

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const thisMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

    // Today's income
    const todayIncomes = incomeList?.filter(i => i.date === today) || [];
    const todayTotal = todayIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const todayCash = todayIncomes.reduce((sum, i) => sum + (i.cashAmount || 0), 0);
    const todayOnline = todayIncomes.reduce((sum, i) => sum + (i.onlineAmount || 0), 0);

    // This month's income
    const thisMonthIncomes = incomeList?.filter(i => i.date?.startsWith(thisMonth)) || [];
    const thisMonthTotal = thisMonthIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);

    // Last month's income
    const lastMonthIncomes = incomeList?.filter(i => i.date?.startsWith(lastMonth)) || [];
    const lastMonthTotal = lastMonthIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);

    // Income trend
    const incomeTrend = lastMonthTotal > 0 
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : thisMonthTotal > 0 ? 100 : 0;

    // Pending amounts
    const totalPendingUdhar = udharList
      ?.filter(u => u.paymentStatus !== "paid")
      .reduce((sum, u) => {
        const total = u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0);
        const paid = u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0);
        return sum + Math.max(0, total - paid);
      }, 0) || 0;

    const totalPendingTransactions = transactions
      ?.filter(t => t.paymentStatus !== "paid")
      .reduce((sum, t) => {
        const paid = t.paidAmount || (t.paidCash || 0) + (t.paidOnline || 0);
        return sum + Math.max(0, t.amount - paid);
      }, 0) || 0;

    return {
      todayTotal,
      todayCash,
      todayOnline,
      thisMonthTotal,
      lastMonthTotal,
      incomeTrend,
      totalPendingUdhar,
      totalPendingTransactions,
      totalCustomers: customers?.length || 0,
      totalSuppliers: suppliers?.length || 0,
    };
  }, [incomeList, udharList, transactions, customers, suppliers]);

  // Helper function to get the last day of a month
  const getLastDayOfMonth = yearMonth => {
    const [year, month] = yearMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0);
    return lastDay.toISOString().split("T")[0];
  };

  // Refs for auto-focus
  const cashInputRef = useRef(null);

  // Auto-focus cash input when income form opens
  useEffect(() => {
    if (incomeFormOpen && cashInputRef.current) {
      setTimeout(() => {
        cashInputRef.current?.focus();
      }, 1000);
    }
  }, [incomeFormOpen]);

  const handleAddTransaction = async data => {
    await addTransaction(data);
    setTransactionInitialImages([]);
  };

  const handleAddUdhar = async data => {
    await addUdhar(data);
    setUdharInitialData(null);
  };

  const handleAddIncome = async () => {
    const cashAmt = Number(incomeFormData.cashAmount) || 0;
    const onlineAmt = Number(incomeFormData.onlineAmount) || 0;
    const totalAmt = cashAmt + onlineAmt;

    if (totalAmt <= 0) {
      toast.error("Please enter at least one amount");
      return;
    }

    const finalDate =
      incomeFormData.type === "monthly"
        ? getLastDayOfMonth(incomeFormData.month)
        : incomeFormData.date;

    const result = await addIncome({
      type: incomeFormData.type,
      cashAmount: cashAmt,
      onlineAmount: onlineAmt,
      amount: totalAmt,
      date: finalDate,
      description: incomeFormData.description,
    });

    if (result.success) {
      toast.success("Income added!");
      setIncomeFormOpen(false);
      setIncomeFormData({
        type: "daily",
        cashAmount: "",
        onlineAmount: "",
        date: new Date().toISOString().split("T")[0],
        month: new Date().toISOString().slice(0, 7),
        description: "",
      });
    } else {
      toast.error("Failed to add income");
    }
  };

  const incomeFormTotal =
    (Number(incomeFormData.cashAmount) || 0) + (Number(incomeFormData.onlineAmount) || 0);

  // Open Vyapari Bill
  const openVyapariBill = () => {
    haptics.light();
    setFabOpen(false);
    if (!isOnline) {
      haptics.error();
      toast.error("Cannot add while offline");
      return;
    }
    if (suppliers.length === 0) {
      toast.error("Please add a vyapari first");
      return;
    }
    setSupplierDropdownOpen(true);
    setTransactionFormOpen(true);
  };

  // Open Add Udhar
  const openAddUdhar = () => {
    haptics.light();
    setFabOpen(false);
    if (!isOnline) {
      haptics.error();
      toast.error("Cannot add while offline");
      return;
    }
    if (customers.length === 0) {
      toast.error("Please add a customer first");
      return;
    }
    setCustomerDropdownOpen(true);
    setUdharFormOpen(true);
  };

  // Open Income Form
  const openIncomeForm = () => {
    haptics.light();
    setFabOpen(false);
    if (!isOnline) {
      haptics.error();
      toast.error("Cannot add while offline");
      return;
    }
    setIncomeFormOpen(true);
  };

  // Open Customer Form
  const openCustomerForm = () => {
    haptics.light();
    setFabOpen(false);
    if (!isOnline) {
      haptics.error();
      toast.error("Cannot add while offline");
      return;
    }
    setCustomerFormOpen(true);
  };

  // Open Supplier Form
  const openSupplierForm = () => {
    haptics.light();
    setFabOpen(false);
    if (!isOnline) {
      haptics.error();
      toast.error("Cannot add while offline");
      return;
    }
    setSupplierFormOpen(true);
  };

  // Camera capture functions
  const handleCameraCapture = () => {
    haptics.light();
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleImageCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        setCameraOpen(true);
      };
      reader.readAsDataURL(file);
      // Reset the input so the same file can be selected again
      e.target.value = "";
    }
  };

  const handleAttachToUdhar = () => {
    haptics.light();
    setCameraOpen(false);
    
    if (!isOnline) {
      haptics.error();
      toast.error("Cannot add while offline");
      setCapturedImage(null);
      return;
    }

    if (customers.length === 0) {
      // No customers, open customer form instead
      toast.info("Please add a customer first");
      setCustomerFormOpen(true);
      setCapturedImage(null);
      return;
    }

    // Set the captured image as khataPhotos for the udhar form
    setUdharInitialData({
      khataPhotos: [capturedImage],
    });
    setCustomerDropdownOpen(true);
    setUdharFormOpen(true);
    setCapturedImage(null);
  };

  const handleAttachToVyapari = () => {
    haptics.light();
    setCameraOpen(false);
    
    if (!isOnline) {
      haptics.error();
      toast.error("Cannot add while offline");
      setCapturedImage(null);
      return;
    }

    if (suppliers.length === 0) {
      // No suppliers, open supplier form instead
      toast.info("Please add a vyapari first");
      setSupplierFormOpen(true);
      setCapturedImage(null);
      return;
    }

    // Set the captured image for the transaction form
    setTransactionInitialImages([capturedImage]);
    setSupplierDropdownOpen(true);
    setTransactionFormOpen(true);
    setCapturedImage(null);
  };

  // Check if we have customers/suppliers
  const hasCustomers = customers && customers.length > 0;
  const hasSuppliers = suppliers && suppliers.length > 0;
  const hasAnyData = hasCustomers || hasSuppliers;

  // Navigation handlers for stat tiles
  const handleTodayIncomeClick = () => {
    haptics.light();
    router.push("/reports?scrollTo=income&expandIncome=true");
  };

  const handleThisMonthClick = () => {
    haptics.light();
    router.push("/reports?scrollTo=monthly&expandMonthly=true");
  };

  const handlePendingUdharClick = () => {
    haptics.light();
    router.push("/customers?filter=pending");
  };

  const handlePendingBillsClick = () => {
    haptics.light();
    router.push("/suppliers?filter=pending");
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col p-4 pb-24 lg:p-6 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-2xl font-bold text-transparent">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Overview of your shop</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Today's Income */}
        <Card 
          className="cursor-pointer border-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={handleTodayIncomeClick}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today&apos;s Income</p>
                <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{stats.todayTotal.toLocaleString()}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Banknote className="h-3 w-3" />
                    ₹{stats.todayCash.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Smartphone className="h-3 w-3" />
                    ₹{stats.todayOnline.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-emerald-500/20 p-2">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end text-xs text-emerald-600">
              <span>View details</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card 
          className="cursor-pointer border-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={handleThisMonthClick}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                  ₹{stats.thisMonthTotal.toLocaleString()}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {stats.incomeTrend >= 0 ? (
                    <span className="flex items-center text-emerald-600">
                      <TrendingUp className="h-3 w-3" />
                      +{stats.incomeTrend.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="flex items-center text-red-500">
                      <TrendingDown className="h-3 w-3" />
                      {stats.incomeTrend.toFixed(0)}%
                    </span>
                  )}
                  <span className="text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end text-xs text-blue-600">
              <span>View breakdown</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Udhar */}
        <Card 
          className="cursor-pointer border-0 bg-gradient-to-br from-orange-500/10 to-rose-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={handlePendingUdharClick}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Udhar</p>
                <p className="mt-1 text-xl font-bold text-orange-600 dark:text-orange-400">
                  ₹{stats.totalPendingUdhar.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats.totalCustomers} customers
                </p>
              </div>
              <div className="rounded-lg bg-orange-500/20 p-2">
                <Wallet className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end text-xs text-orange-600">
              <span>View pending</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Vyapari Bills */}
        <Card 
          className="cursor-pointer border-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={handlePendingBillsClick}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Bills</p>
                <p className="mt-1 text-xl font-bold text-purple-600 dark:text-purple-400">
                  ₹{stats.totalPendingTransactions.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats.totalSuppliers} vyaparis
                </p>
              </div>
              <div className="rounded-lg bg-purple-500/20 p-2">
                <Receipt className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end text-xs text-purple-600">
              <span>View pending</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Camera Access */}
      <div className="mb-6">
        <Card 
          className={cn(
            "border-2 border-dashed transition-all",
            hasAnyData 
              ? "cursor-pointer border-pink-300 bg-gradient-to-br from-pink-500/5 to-rose-500/5 hover:border-pink-400 hover:from-pink-500/10 hover:to-rose-500/10 active:scale-[0.98] dark:border-pink-800"
              : "cursor-not-allowed border-muted bg-muted/20 opacity-60"
          )}
          onClick={hasAnyData ? handleCameraCapture : undefined}
        >
          <CardContent className="flex items-center justify-center gap-3 p-6">
            <div className={cn(
              "rounded-full p-3",
              hasAnyData ? "bg-pink-500/20" : "bg-muted"
            )}>
              <Camera className={cn(
                "h-6 w-6",
                hasAnyData ? "text-pink-600" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className={cn(
                "font-medium",
                hasAnyData ? "text-pink-600" : "text-muted-foreground"
              )}>
                Quick Bill Capture
              </p>
              <p className="text-xs text-muted-foreground">
                {hasAnyData 
                  ? "Tap to capture bill image" 
                  : "Add a customer or vyapari first"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="flex-1">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Quick Actions</h2>
        <Card className="border-0 bg-muted/30">
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-muted p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Use the + button to add transactions, udhar, or income
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hidden Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageCapture}
        className="hidden"
        disabled={!hasAnyData}
      />

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-50 lg:bottom-8">
        {/* FAB Menu Items */}
        <div
          className={cn(
            "mb-3 flex flex-col items-end gap-2 transition-all duration-300",
            fabOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {/* Each FAB item with label badge */}
          
          {/* Camera Capture - Only show if there's data */}
          {hasAnyData && (
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-pink-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
                Capture Bill
              </span>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-pink-500 shadow-lg hover:bg-pink-600"
                onClick={handleCameraCapture}
              >
                <Camera className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Add Customer */}
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
              Add Customer
            </span>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-cyan-500 shadow-lg hover:bg-cyan-600"
              onClick={openCustomerForm}
            >
              <UserPlus className="h-5 w-5" />
            </Button>
          </div>

          {/* Add Supplier */}
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-400 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
              Add Vyapari
            </span>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-indigo-400 shadow-lg hover:bg-indigo-500"
              onClick={openSupplierForm}
            >
              <Store className="h-5 w-5" />
            </Button>
          </div>

          {/* Add Udhar - only if customers exist */}
          {hasCustomers && (
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
                Add Udhar
              </span>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-orange-500 shadow-lg hover:bg-orange-600"
                onClick={openAddUdhar}
              >
                <Banknote className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Daily Income */}
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
              Add Income
            </span>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full bg-emerald-500 shadow-lg hover:bg-emerald-600"
              onClick={openIncomeForm}
            >
              <IndianRupee className="h-5 w-5" />
            </Button>
          </div>

          {/* Vyapari Bill - only if suppliers exist */}
          {hasSuppliers && (
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg">
                Vyapari Bill
              </span>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full bg-indigo-500 shadow-lg hover:bg-indigo-600"
                onClick={openVyapariBill}
              >
                <Receipt className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Main FAB Button */}
        <Button
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg transition-all duration-300",
            fabOpen
              ? "bg-red-500 hover:bg-red-600 rotate-45"
              : "bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          )}
          onClick={() => {
            haptics.light();
            setFabOpen(!fabOpen);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* FAB Backdrop */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* Camera Capture Sheet */}
      <Sheet open={cameraOpen} onOpenChange={setCameraOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-2xl">
          <SheetHeader className="pb-4 text-center">
            <SheetTitle className="flex items-center justify-center gap-2">
              <Camera className="h-5 w-5" />
              Captured Image
            </SheetTitle>
          </SheetHeader>

          {capturedImage && (
            <div className="space-y-4 pb-6">
              <div className="mx-auto max-w-sm overflow-hidden rounded-lg border">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="h-auto w-full object-cover"
                />
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Where do you want to attach this image?
              </p>

              {/* Show only relevant options based on data availability */}
              <div className={cn(
                "grid gap-3",
                hasCustomers && hasSuppliers ? "grid-cols-2" : "grid-cols-1"
              )}>
                {/* Add to Udhar - Only show if customers exist */}
                {hasCustomers && (
                  <Button
                    variant="outline"
                    className="h-16 flex-col gap-1"
                    onClick={handleAttachToUdhar}
                  >
                    <Banknote className="h-5 w-5 text-orange-500" />
                    <span className="text-xs">Add to Udhar</span>
                  </Button>
                )}

                {/* Add to Vyapari - Only show if suppliers exist */}
                {hasSuppliers && (
                  <Button
                    variant="outline"
                    className="h-16 flex-col gap-1"
                    onClick={handleAttachToVyapari}
                  >
                    <Receipt className="h-5 w-5 text-indigo-500" />
                    <span className="text-xs">Add to Vyapari Bill</span>
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setCameraOpen(false);
                  setCapturedImage(null);
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Forms */}
      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={open => {
          setTransactionFormOpen(open);
          if (!open) {
            setTransactionInitialImages([]);
            setSupplierDropdownOpen(false);
          }
        }}
        onSubmit={handleAddTransaction}
        suppliers={suppliers}
        autoOpenSupplierDropdown={supplierDropdownOpen}
        initialBillImages={transactionInitialImages}
      />

      <UdharForm
        open={udharFormOpen}
        onOpenChange={open => {
          setUdharFormOpen(open);
          if (!open) {
            setUdharInitialData(null);
            setCustomerDropdownOpen(false);
          }
        }}
        onSubmit={handleAddUdhar}
        onAddCustomer={addCustomer}
        customers={customers}
        autoOpenCustomerDropdown={customerDropdownOpen}
        initialData={udharInitialData}
      />

      {/* Customer Form */}
      <CustomerForm
        open={customerFormOpen}
        onOpenChange={open => {
          setCustomerFormOpen(open);
          if (!open) {
            setInitialUdharAmount("");
          }
        }}
        onSubmit={async data => {
          const result = await addCustomer(data);
          if (result.success) {
            toast.success("Customer added successfully");

            // Create initial udhar if amount is provided
            if (initialUdharAmount && Number(initialUdharAmount) > 0 && result.data?.id) {
              const udharResult = await addUdhar({
                customerId: result.data.id,
                amount: Number(initialUdharAmount),
                description: "Initial balance (खाता बाकी)",
                date: new Date().toISOString().split("T")[0],
                khataPhotos: data.khataPhotos || [],
              });
              if (udharResult.success) {
                toast.success(
                  `Initial udhar of ₹${Number(initialUdharAmount).toLocaleString()} added`
                );
              }
            }
          } else {
            toast.error("Failed to add customer");
          }
        }}
        title="Add Customer"
        showInitialAmount={true}
        initialAmount={initialUdharAmount}
        onInitialAmountChange={setInitialUdharAmount}
      />

      {/* Supplier Form */}
      <SupplierForm
        open={supplierFormOpen}
        onOpenChange={setSupplierFormOpen}
        onSubmit={async data => {
          const result = await addSupplier(data);
          if (result.success) {
            toast.success("Vyapari added successfully");
          } else {
            toast.error("Failed to add vyapari");
          }
        }}
        title="Add Vyapari"
      />

      {/* Daily Income Form - Sheet sliding from top */}
      <Sheet open={incomeFormOpen} onOpenChange={setIncomeFormOpen}>
        <SheetContent side="top" className="flex flex-col rounded-b-2xl p-0" hideClose>
          {/* Header with action buttons */}
          <SheetHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIncomeFormOpen(false)}
                className="h-9 px-3"
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <SheetTitle className="flex-1 text-center text-base font-semibold">
                Add Income
              </SheetTitle>
              <Button
                size="sm"
                onClick={handleAddIncome}
                disabled={incomeFormTotal <= 0}
                className="h-9 bg-green-600 px-3 hover:bg-green-700"
              >
                <Check className="mr-1 h-4 w-4" />
                Save
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-5">
              {/* Type Switch */}
              <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Monthly Income</span>
                </div>
                <Switch
                  checked={incomeFormData.type === "monthly"}
                  onCheckedChange={checked =>
                    setIncomeFormData({
                      ...incomeFormData,
                      type: checked ? "monthly" : "daily",
                    })
                  }
                />
              </div>

              {/* Amount Inputs - Side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Banknote className="h-4 w-4 text-green-600" />
                    Cash
                  </Label>
                  <Input
                    ref={cashInputRef}
                    type="number"
                    inputMode="numeric"
                    value={incomeFormData.cashAmount}
                    onChange={e =>
                      setIncomeFormData({
                        ...incomeFormData,
                        cashAmount: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="h-14 text-center text-2xl font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-4 w-4 text-blue-600" />
                    Online
                  </Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={incomeFormData.onlineAmount}
                    onChange={e =>
                      setIncomeFormData({
                        ...incomeFormData,
                        onlineAmount: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="h-14 text-center text-2xl font-bold"
                  />
                </div>
              </div>

              {/* Total Display */}
              <div className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-5">
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Total Income</span>
                  <div className="mt-1 text-4xl font-bold text-green-600">
                    ₹{incomeFormTotal.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Date / Month selector */}
              <div className="space-y-2">
                <Label className="text-sm">
                  {incomeFormData.type === "monthly" ? "Month" : "Date"}
                </Label>
                {incomeFormData.type === "monthly" ? (
                  <Input
                    type="month"
                    value={incomeFormData.month}
                    onChange={e => setIncomeFormData({ ...incomeFormData, month: e.target.value })}
                    className="h-12"
                  />
                ) : (
                  <Input
                    type="date"
                    value={incomeFormData.date}
                    onChange={e => setIncomeFormData({ ...incomeFormData, date: e.target.value })}
                    max={new Date().toISOString().split("T")[0]}
                    className="h-12"
                  />
                )}
                {incomeFormData.type === "monthly" && incomeFormData.month && (
                  <p className="text-xs text-muted-foreground">
                    Will be saved as: {getLastDayOfMonth(incomeFormData.month)} (last day of month)
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm">Notes (Optional)</Label>
                <Input
                  value={incomeFormData.description}
                  onChange={e =>
                    setIncomeFormData({
                      ...incomeFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Add any notes..."
                  className="h-12"
                />
              </div>
            </div>
          </div>

          {/* Drag handle at bottom */}
          <div className="flex justify-center pb-3 pt-2" data-drag-handle>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
