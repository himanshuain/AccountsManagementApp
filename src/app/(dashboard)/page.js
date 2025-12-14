"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Receipt,
  IndianRupee,
  Plus,
  Store,
  Banknote,
  Smartphone,
  UserPlus,
  X,
  Check,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { haptics } from "@/hooks/useHaptics";

export default function DashboardPage() {
  const isOnline = useOnlineStatus();
  const { suppliers } = useSuppliers();
  const { addTransaction } = useTransactions();
  const { customers, addCustomer } = useCustomers();
  const { addUdhar } = useUdhar();
  const { addIncome } = useIncome();

  // Form states
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [quickCaptureData, setQuickCaptureData] = useState(null);

  // For auto-opening dropdowns
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // Income form data
  const [incomeFormData, setIncomeFormData] = useState({
    type: "daily",
    cashAmount: "",
    onlineAmount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

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

  const handleAddTransaction = async (data) => {
    await addTransaction(data);
    setQuickCaptureData(null);
  };

  const handleAddUdhar = async (data) => {
    await addUdhar(data);
  };

  const handleAddIncome = async () => {
    const cashAmt = Number(incomeFormData.cashAmount) || 0;
    const onlineAmt = Number(incomeFormData.onlineAmount) || 0;
    const totalAmt = cashAmt + onlineAmt;

    if (totalAmt <= 0) {
      toast.error("Please enter at least one amount");
      return;
    }

    const result = await addIncome({
      type: incomeFormData.type,
      cashAmount: cashAmt,
      onlineAmount: onlineAmt,
      amount: totalAmt,
      date: incomeFormData.date,
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
        description: "",
      });
    } else {
      toast.error("Failed to add income");
    }
  };

  const incomeFormTotal =
    (Number(incomeFormData.cashAmount) || 0) +
    (Number(incomeFormData.onlineAmount) || 0);

  // Open Vyapari Bill (transaction form with supplier dropdown open)
  const openVyapariBill = () => {
    haptics.light();
    if (!isOnline) {
      haptics.error();
      toast.error("Cannot add while offline");
      return;
    }
    if (suppliers.length === 0) {
      toast.error("Please add a supplier first");
      return;
    }
    setSupplierDropdownOpen(true);
    setTransactionFormOpen(true);
  };

  // Open Add Udhar (with customer dropdown open)
  const openAddUdhar = () => {
    haptics.light();
    if (!isOnline) {
      haptics.error();
      toast.error("Cannot add while offline");
      return;
    }
    setCustomerDropdownOpen(true);
    setUdharFormOpen(true);
  };

  return (
    <div className="p-4 lg:p-6 flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Quick actions for your shop
        </p>
      </div>

      {/* 2x2 Quick Action Grid */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        {/* Vyapari Bill (Quick Bill Capture) */}
        <Card
          className={`cursor-pointer transition-all active:scale-[0.98] border-0 shadow-sm ${
            isOnline && suppliers.length > 0
              ? "hover:shadow-xl hover:scale-[1.02] bg-gradient-to-br from-indigo-500 to-purple-600"
              : "opacity-50 cursor-not-allowed bg-gradient-to-br from-indigo-400 to-purple-500"
          }`}
          onClick={openVyapariBill}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[140px]">
            <div className="rounded-2xl bg-white/20 backdrop-blur-sm p-4 mb-3 shadow-lg">
              <Store className="h-8 w-8 text-white" />
            </div>
            <span className="text-base font-semibold text-center text-white">
              Capture Vyapari Bill
            </span>
            <span className="text-xs text-white/70 mt-1">
              Quick scan
            </span>
          </CardContent>
        </Card>

        {/* Daily Income */}
        <Card
          className={`cursor-pointer transition-all active:scale-[0.98] border-0 shadow-sm ${
            isOnline
              ? "hover:shadow-xl hover:scale-[1.02] bg-gradient-to-br from-emerald-500 to-teal-600"
              : "opacity-50 cursor-not-allowed bg-gradient-to-br from-emerald-400 to-teal-500"
          }`}
          onClick={() => {
            haptics.light();
            if (!isOnline) {
              haptics.error();
              toast.error("Cannot add while offline");
              return;
            }
            setIncomeFormOpen(true);
          }}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[140px]">
            <div className="rounded-2xl bg-white/20 backdrop-blur-sm p-4 mb-3 shadow-lg">
              <IndianRupee className="h-8 w-8 text-white" />
            </div>
            <span className="text-base font-semibold text-center text-white">
              Daily Income
            </span>
            <span className="text-xs text-white/70 mt-1">
              Record earnings
            </span>
          </CardContent>
        </Card>

        {/* Add Udhar */}
        <Card
          className={`cursor-pointer transition-all active:scale-[0.98] border-0 shadow-sm ${
            isOnline
              ? "hover:shadow-xl hover:scale-[1.02] bg-gradient-to-br from-orange-500 to-rose-500"
              : "opacity-50 cursor-not-allowed bg-gradient-to-br from-orange-400 to-rose-400"
          }`}
          onClick={openAddUdhar}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[140px]">
            <div className="rounded-2xl bg-white/20 backdrop-blur-sm p-4 mb-3 shadow-lg">
              <Banknote className="h-8 w-8 text-white" />
            </div>
            <span className="text-base font-semibold text-center text-white">
              Add Udhar
            </span>
            <span className="text-xs text-white/70 mt-1">
              Customer lending
            </span>
          </CardContent>
        </Card>

        {/* Add Customer */}
        <Card
          className={`cursor-pointer transition-all active:scale-[0.98] border-0 shadow-sm ${
            isOnline
              ? "hover:shadow-xl hover:scale-[1.02] bg-gradient-to-br from-cyan-500 to-blue-600"
              : "opacity-50 cursor-not-allowed bg-gradient-to-br from-cyan-400 to-blue-500"
          }`}
          onClick={() => {
            haptics.light();
            if (!isOnline) {
              haptics.error();
              toast.error("Cannot add while offline");
              return;
            }
            setCustomerFormOpen(true);
          }}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[140px]">
            <div className="rounded-2xl bg-white/20 backdrop-blur-sm p-4 mb-3 shadow-lg">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <span className="text-base font-semibold text-center text-white">
              Add Customer
            </span>
            <span className="text-xs text-white/70 mt-1">
              New customer
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Forms */}

      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={(open) => {
          setTransactionFormOpen(open);
          if (!open) {
            setQuickCaptureData(null);
            setSupplierDropdownOpen(false);
          }
        }}
        onSubmit={handleAddTransaction}
        suppliers={suppliers}
        quickCaptureData={quickCaptureData}
        autoOpenSupplierDropdown={supplierDropdownOpen}
      />

      <UdharForm
        open={udharFormOpen}
        onOpenChange={(open) => {
          setUdharFormOpen(open);
          if (!open) {
            setCustomerDropdownOpen(false);
          }
        }}
        onSubmit={handleAddUdhar}
        onAddCustomer={addCustomer}
        customers={customers}
        autoOpenCustomerDropdown={customerDropdownOpen}
      />

      {/* Customer Form */}
      <CustomerForm
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
        onSubmit={async (data) => {
          const result = await addCustomer(data);
          if (result.success) {
            toast.success("Customer added successfully");
          } else {
            toast.error("Failed to add customer");
          }
        }}
        title="Add Customer"
      />

      {/* Daily Income Form - Sheet sliding from top */}
      <Sheet open={incomeFormOpen} onOpenChange={setIncomeFormOpen}>
        <SheetContent
          side="top"
          className="rounded-b-2xl p-0 flex flex-col"
          hideClose
        >
          {/* Header with action buttons */}
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIncomeFormOpen(false)}
                className="h-9 px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <SheetTitle className="text-base font-semibold flex-1 text-center">
                Add Income
              </SheetTitle>
              <Button
                size="sm"
                onClick={handleAddIncome}
                disabled={incomeFormTotal <= 0}
                className="h-9 px-3 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-5">
              {/* Type Switch */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Monthly Income</span>
                </div>
                <Switch
                  checked={incomeFormData.type === "monthly"}
                  onCheckedChange={(checked) =>
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
                    onChange={(e) =>
                      setIncomeFormData({
                        ...incomeFormData,
                        cashAmount: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="text-2xl h-14 font-bold text-center"
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
                    onChange={(e) =>
                      setIncomeFormData({
                        ...incomeFormData,
                        onlineAmount: e.target.value,
                      })
                    }
                    placeholder="0"
                    className="text-2xl h-14 font-bold text-center"
                  />
                </div>
              </div>

              {/* Total Display - Prominent at top */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">Total Income</span>
                  <div className="text-4xl font-bold text-green-600 mt-1">
                    ₹{incomeFormTotal.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label className="text-sm">Date</Label>
                <Input
                  type="date"
                  value={incomeFormData.date}
                  onChange={(e) =>
                    setIncomeFormData({ ...incomeFormData, date: e.target.value })
                  }
                  className="h-12"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm">Notes (Optional)</Label>
                <Input
                  value={incomeFormData.description}
                  onChange={(e) =>
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
          <div className="flex justify-center pb-3 pt-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
