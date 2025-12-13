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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useIncome from "@/hooks/useIncome";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { SupplierForm } from "@/components/SupplierForm";
import { TransactionForm } from "@/components/TransactionForm";
import { UdharForm } from "@/components/UdharForm";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { haptics } from "@/hooks/useHaptics";

export default function DashboardPage() {
  const isOnline = useOnlineStatus();
  const { suppliers, addSupplier } = useSuppliers();
  const { addTransaction } = useTransactions();
  const { customers, addCustomer } = useCustomers();
  const { addUdhar } = useUdhar();
  const { addIncome } = useIncome();
  
  // Form states
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
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
      }, 100);
    }
  }, [incomeFormOpen]);

  const handleAddSupplier = async (data) => {
    await addSupplier(data);
  };

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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Quick actions for your shop
        </p>
      </div>

      {/* 2x2 Quick Action Grid */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        {/* Vyapari Bill (Quick Bill Capture) */}
        <Card
          className={`cursor-pointer transition-all active:scale-[0.98] ${
            isOnline && suppliers.length > 0
              ? "hover:shadow-lg hover:border-blue-500/50 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20"
              : "opacity-50 cursor-not-allowed"
          }`}
          onClick={openVyapariBill}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[140px]">
            <div className="rounded-2xl bg-blue-500 p-4 mb-3 shadow-lg">
              <Store className="h-8 w-8 text-white" />
            </div>
            <span className="text-base font-semibold text-center">
              Vyapari Bill
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Add supplier transaction
            </span>
          </CardContent>
        </Card>

        {/* Daily Income */}
        <Card
          className={`cursor-pointer transition-all active:scale-[0.98] ${
            isOnline
              ? "hover:shadow-lg hover:border-green-500/50 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20"
              : "opacity-50 cursor-not-allowed"
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
            <div className="rounded-2xl bg-green-500 p-4 mb-3 shadow-lg">
              <IndianRupee className="h-8 w-8 text-white" />
            </div>
            <span className="text-base font-semibold text-center">
              Daily Income
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Record shop earnings
            </span>
          </CardContent>
        </Card>

        {/* Add Udhar */}
        <Card
          className={`cursor-pointer transition-all active:scale-[0.98] ${
            isOnline
              ? "hover:shadow-lg hover:border-amber-500/50 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20"
              : "opacity-50 cursor-not-allowed"
          }`}
          onClick={openAddUdhar}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[140px]">
            <div className="rounded-2xl bg-amber-500 p-4 mb-3 shadow-lg">
              <Banknote className="h-8 w-8 text-white" />
            </div>
            <span className="text-base font-semibold text-center">
              Add Udhar
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              Customer lending
            </span>
          </CardContent>
        </Card>

        {/* Add Supplier */}
        <Card
          className={`cursor-pointer transition-all active:scale-[0.98] ${
            isOnline
              ? "hover:shadow-lg hover:border-purple-500/50 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20"
              : "opacity-50 cursor-not-allowed"
          }`}
          onClick={() => {
            haptics.light();
            if (!isOnline) {
              haptics.error();
              toast.error("Cannot add while offline");
              return;
            }
            setSupplierFormOpen(true);
          }}
        >
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[140px]">
            <div className="rounded-2xl bg-purple-500 p-4 mb-3 shadow-lg">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <span className="text-base font-semibold text-center">
              Add Supplier
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              New business contact
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Add Transaction Button */}
      <div className="mt-4">
        <Button
          className="w-full h-12 text-base"
          onClick={() => {
            haptics.light();
            if (!isOnline) {
              haptics.error();
              toast.error("Cannot add while offline");
              return;
            }
            setTransactionFormOpen(true);
          }}
          disabled={!isOnline || suppliers.length === 0}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Search Bar at Bottom */}
      <div className="mt-4 pt-4 border-t">
        <GlobalSearch className="w-full" placeholder="Search suppliers, transactions, customers..." />
      </div>

      {/* Forms */}
      <SupplierForm
        open={supplierFormOpen}
        onOpenChange={setSupplierFormOpen}
        onSubmit={handleAddSupplier}
      />

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

      {/* Daily Income Form */}
      <Dialog open={incomeFormOpen} onOpenChange={setIncomeFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Daily Income</DialogTitle>
            <DialogDescription>
              Record today&apos;s shop income
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={incomeFormData.type}
                onValueChange={(v) =>
                  setIncomeFormData({ ...incomeFormData, type: v })
                }
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

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-500" />
                Cash Amount (₹)
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
                value={incomeFormData.onlineAmount}
                onChange={(e) =>
                  setIncomeFormData({
                    ...incomeFormData,
                    onlineAmount: e.target.value,
                  })
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
                  ₹{incomeFormTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={incomeFormData.date}
                onChange={(e) =>
                  setIncomeFormData({ ...incomeFormData, date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={incomeFormData.description}
                onChange={(e) =>
                  setIncomeFormData({
                    ...incomeFormData,
                    description: e.target.value,
                  })
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
              <Button onClick={handleAddIncome} className="flex-1">
                Add Income
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
