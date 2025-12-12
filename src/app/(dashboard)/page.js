"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Receipt,
  IndianRupee,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  Camera,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useIncome from "@/hooks/useIncome";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { SupplierForm } from "@/components/SupplierForm";
import { TransactionForm } from "@/components/TransactionForm";
import { QuickBillCapture } from "@/components/QuickBillCapture";
import { UdharForm } from "@/components/UdharForm";
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

export default function DashboardPage() {
  const isOnline = useOnlineStatus();
  const { suppliers, addSupplier } = useSuppliers();
  const {
    transactions,
    addTransaction,
    getPendingPayments,
    getRecentTransactions,
  } = useTransactions();
  const { customers, addCustomer } = useCustomers();
  const { udharList, addUdhar, getPending: getPendingUdhar } = useUdhar();
  const { addIncome, getTotalIncome } = useIncome();

  const [pendingPayments, setPendingPayments] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [pendingUdhar, setPendingUdhar] = useState([]);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [quickCaptureData, setQuickCaptureData] = useState(null);
  const [incomeFormData, setIncomeFormData] = useState({
    type: "daily",
    cashAmount: "",
    onlineAmount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      const pending = await getPendingPayments();
      const recent = await getRecentTransactions(5);
      const pendingU = await getPendingUdhar();
      setPendingPayments(pending);
      setRecentTransactions(recent);
      setPendingUdhar(pendingU);
    };
    loadDashboardData();
  }, [
    getPendingPayments,
    getRecentTransactions,
    getPendingUdhar,
    transactions,
    udharList,
  ]);

  // Calculate stats
  const totalSuppliers = suppliers.length;
  const totalTransactions = transactions.length;
  const pendingAmount = pendingPayments.reduce(
    (sum, t) => sum + (t.amount || 0),
    0,
  );
  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Udhar stats
  const totalUdhar = udharList.reduce(
    (sum, u) => sum + (u.cashAmount || 0) + (u.onlineAmount || 0),
    0,
  );
  const pendingUdharAmount = pendingUdhar.reduce(
    (sum, u) => sum + (u.cashAmount || 0) + (u.onlineAmount || 0),
    0,
  );

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.companyName || supplier?.name || "Unknown";
  };

  const getSupplierInitials = (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return (
      supplier?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "Unknown";
  };

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

  const handleQuickCapture = ({ supplierId, supplierName, images }) => {
    if (!isOnline) {
      toast.error("Cannot add while offline");
      return;
    }
    setQuickCaptureData({ supplierId, images });
    setTransactionFormOpen(true);
    toast.success(`${images.length} bill(s) captured for ${supplierName}`);
  };

  const paymentStatusColors = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    partial: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s your shop overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!isOnline) {
                toast.error("Cannot add while offline");
                return;
              }
              setSupplierFormOpen(true);
            }}
            disabled={!isOnline}
          >
            <Plus className="h-4 w-4 mr-2" />
            Supplier
          </Button>
          <Button
            onClick={() => {
              if (!isOnline) {
                toast.error("Cannot add while offline");
                return;
              }
              setTransactionFormOpen(true);
            }}
            disabled={!isOnline}
          >
            <Plus className="h-4 w-4 mr-2" />
            Transaction
          </Button>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-3 gap-3">
        <QuickBillCapture
          suppliers={suppliers}
          onCapture={handleQuickCapture}
          disabled={suppliers.length === 0 || !isOnline}
          variant="tile"
        />
        <Card
          className={`cursor-pointer transition-colors border-dashed border-2 ${
            isOnline
              ? "hover:bg-accent/50 hover:border-green-500/50"
              : "opacity-50 cursor-not-allowed"
          }`}
          onClick={() => {
            if (!isOnline) {
              toast.error("Cannot add while offline");
              return;
            }
            setIncomeFormOpen(true);
          }}
        >
          <CardContent className="p-3 flex flex-col items-center justify-center gap-2 h-full min-h-[100px]">
            <div className="rounded-full bg-green-500/10 p-3">
              <IndianRupee className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-center">
              Daily Income
            </span>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors border-dashed border-2 ${
            isOnline
              ? "hover:bg-accent/50 hover:border-amber-500/50"
              : "opacity-50 cursor-not-allowed"
          }`}
          onClick={() => {
            if (!isOnline) {
              toast.error("Cannot add while offline");
              return;
            }
            setUdharFormOpen(true);
          }}
        >
          <CardContent className="p-3 flex flex-col items-center justify-center gap-2 h-full min-h-[100px]">
            <div className="rounded-full bg-amber-500/10 p-3">
              <Banknote className="h-6 w-6 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-center">Add Udhar</span>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/suppliers">
          <Card className="cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalSuppliers}</p>
                  <p className="text-xs text-muted-foreground">Suppliers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions">
          <Card className="cursor-pointer hover:border-green-500/50 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalTransactions}</p>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions?tab=customers">
          <Card className="cursor-pointer hover:border-amber-500/50 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Banknote className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ₹{pendingUdharAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Udhar Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions?status=pending">
          <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ₹{pendingAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supplier Pending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Udhar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pending Udhar</CardTitle>
              <Link href="/transactions">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {pendingUdhar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Banknote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pending Udhar</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setUdharFormOpen(true)}
                  disabled={!isOnline}
                >
                  Add your first Udhar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingUdhar.slice(0, 5).map((udhar) => (
                  <div
                    key={udhar.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                        {getCustomerName(udhar.customerId)
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getCustomerName(udhar.customerId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(udhar.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <p className="font-semibold text-amber-600">
                      ₹
                      {(
                        (udhar.cashAmount || 0) + (udhar.onlineAmount || 0)
                      ).toLocaleString()}
                    </p>
                  </div>
                ))}
                {pendingUdhar.length > 5 && (
                  <Link href="/transactions">
                    <Button variant="ghost" size="sm" className="w-full">
                      View all {pendingUdhar.length} pending
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <Link href="/transactions?tab=suppliers">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No transactions yet</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setTransactionFormOpen(true)}
                  disabled={!isOnline}
                >
                  Add your first transaction
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getSupplierInitials(transaction.supplierId)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getSupplierName(transaction.supplierId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                          },
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        ₹{transaction.amount?.toLocaleString()}
                      </p>
                      <Badge
                        className={`text-[10px] ${paymentStatusColors[transaction.paymentStatus]}`}
                      >
                        {transaction.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/suppliers">
              <div className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">View Suppliers</p>
              </div>
            </Link>
            <Link href="/transactions">
              <div className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-center">
                <Receipt className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">All Transactions</p>
              </div>
            </Link>
            <div
              className={`p-4 rounded-lg border transition-colors text-center ${
                isOnline
                  ? "hover:border-primary hover:bg-primary/5 cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              }`}
              onClick={() => isOnline && setSupplierFormOpen(true)}
            >
              <Plus className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">New Supplier</p>
            </div>
            <Link href="/reports">
              <div className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Revenue Reports</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

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
          if (!open) setQuickCaptureData(null);
        }}
        onSubmit={handleAddTransaction}
        suppliers={suppliers}
        quickCaptureData={quickCaptureData}
      />

      <UdharForm
        open={udharFormOpen}
        onOpenChange={setUdharFormOpen}
        onSubmit={handleAddUdhar}
        onAddCustomer={addCustomer}
        customers={customers}
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
