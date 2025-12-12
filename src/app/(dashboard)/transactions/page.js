"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Receipt,
  Filter,
  Image,
  List,
  Download,
  Users,
  Store,
  SortAsc,
  SortDesc,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionTable } from "@/components/TransactionTable";
import { BillGallery } from "@/components/BillGallery";
import { QuickBillCapture } from "@/components/QuickBillCapture";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { UdharForm } from "@/components/UdharForm";
import { UdharList } from "@/components/UdharList";
import { CustomerForm } from "@/components/CustomerForm";
import { exportTransactions } from "@/lib/export";
import { toast } from "sonner";

const DATE_FILTERS = [
  { value: "all", label: "All Time" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 3 Months" },
  { value: "180", label: "Last 6 Months" },
  { value: "365", label: "Last Year" },
];

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();
  const { suppliers } = useSuppliers();
  const {
    transactions,
    loading: transactionsLoading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();
  const { customers, addCustomer } = useCustomers();
  const {
    udharList,
    loading: udharLoading,
    addUdhar,
    updateUdhar,
    deleteUdhar,
    recordDeposit,
    markFullPaid,
  } = useUdhar();

  // Tab state - read from URL or default to customers
  const [mainTab, setMainTab] = useState("customers");

  // Read tab from URL query params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "customers" || tab === "suppliers") {
      setMainTab(tab);
    }
  }, [searchParams]);

  // Supplier transaction states
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [activeSubTab, setActiveSubTab] = useState("list");
  const [quickCaptureData, setQuickCaptureData] = useState(null);

  // Udhar states
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [udharToEdit, setUdharToEdit] = useState(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("date"); // date, amount-high, amount-low
  const [customerFilter, setCustomerFilter] = useState("all");

  // Filter supplier transactions
  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter !== "all" && t.paymentStatus !== statusFilter)
      return false;
    if (supplierFilter !== "all" && t.supplierId !== supplierFilter)
      return false;
    return true;
  });

  // Filter and sort Udhar
  const filteredUdhar = useMemo(() => {
    let filtered = [...udharList];

    // Date filter
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      filtered = filtered.filter((u) => new Date(u.date) >= startDate);
    }

    // Customer filter
    if (customerFilter !== "all") {
      filtered = filtered.filter((u) => u.customerId === customerFilter);
    }

    // Sort
    if (sortOrder === "amount-high") {
      filtered.sort((a, b) => {
        const amountA = (a.cashAmount || 0) + (a.onlineAmount || 0);
        const amountB = (b.cashAmount || 0) + (b.onlineAmount || 0);
        return amountB - amountA;
      });
    } else if (sortOrder === "amount-low") {
      filtered.sort((a, b) => {
        const amountA = (a.cashAmount || 0) + (a.onlineAmount || 0);
        const amountB = (b.cashAmount || 0) + (b.onlineAmount || 0);
        return amountA - amountB;
      });
    }
    // Default sort by date is handled in UdharList

    return filtered;
  }, [udharList, dateFilter, customerFilter, sortOrder]);

  // Calculate stats
  const totalBills = filteredTransactions.reduce(
    (count, t) => count + (t.billImages?.length || 0),
    0,
  );

  // Supplier transaction handlers
  const handleAddTransaction = async (data) => {
    if (!isOnline) {
      toast.error("Cannot add transaction while offline");
      return;
    }
    const result = await addTransaction(data);
    if (result.success) {
      toast.success("Transaction added");
    } else {
      toast.error("Failed to add transaction");
    }
  };

  const handleEditTransaction = (transaction) => {
    if (!isOnline) {
      toast.error("Cannot edit while offline");
      return;
    }
    setTransactionToEdit(transaction);
    setTransactionFormOpen(true);
  };

  const handleUpdateTransaction = async (data) => {
    if (!isOnline) {
      toast.error("Cannot update while offline");
      return;
    }
    const result = await updateTransaction(transactionToEdit.id, data);
    if (result.success) {
      toast.success("Transaction updated");
      setTransactionToEdit(null);
    } else {
      toast.error("Failed to update transaction");
    }
  };

  const handleDeleteClick = (transaction) => {
    if (!isOnline) {
      toast.error("Cannot delete while offline");
      return;
    }
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!isOnline) {
      toast.error("Cannot delete while offline");
      return;
    }
    if (transactionToDelete) {
      const result = await deleteTransaction(transactionToDelete.id);
      if (result.success) {
        toast.success("Transaction deleted");
      } else {
        toast.error("Failed to delete transaction");
      }
      setTransactionToDelete(null);
    }
  };

  const handleQuickCapture = ({ supplierId, supplierName, images }) => {
    if (!isOnline) {
      toast.error("Cannot add transaction while offline");
      return;
    }
    setQuickCaptureData({ supplierId, images });
    setTransactionToEdit(null);
    setTransactionFormOpen(true);
    toast.success(`${images.length} bill(s) captured for ${supplierName}`);
  };

  const handleExport = () => {
    try {
      exportTransactions(filteredTransactions, suppliers);
      toast.success("Exported successfully");
    } catch (error) {
      toast.error("Export failed");
    }
  };

  const openAddForm = () => {
    if (!isOnline) {
      toast.error("Cannot add transaction while offline");
      return;
    }
    setQuickCaptureData(null);
    setTransactionToEdit(null);
    setTransactionFormOpen(true);
  };

  // Udhar handlers
  const handleAddUdhar = async (data) => {
    if (!isOnline) {
      toast.error("Cannot add Udhar while offline");
      return;
    }
    const result = await addUdhar(data);
    if (result.success) {
      toast.success("Udhar added");
    } else {
      toast.error("Failed to add Udhar");
    }
  };

  const handleEditUdhar = (udhar) => {
    if (!isOnline) {
      toast.error("Cannot edit while offline");
      return;
    }
    setUdharToEdit(udhar);
    setUdharFormOpen(true);
  };

  const handleUpdateUdhar = async (data) => {
    if (!isOnline) return;
    const result = await updateUdhar(udharToEdit.id, data);
    if (result.success) {
      toast.success("Udhar updated");
      setUdharToEdit(null);
    } else {
      toast.error("Failed to update");
    }
  };

  const handleDeleteUdhar = async (udhar) => {
    if (!isOnline) {
      toast.error("Cannot delete while offline");
      return;
    }
    const result = await deleteUdhar(udhar.id);
    if (result.success) {
      toast.success("Udhar deleted");
    } else {
      toast.error("Failed to delete");
    }
  };

  const handleDeposit = async (id, amount, mode) => {
    if (!isOnline) {
      toast.error("Cannot record deposit while offline");
      return;
    }
    await recordDeposit(id, amount, mode);
  };

  const handleFullPaid = async (id) => {
    if (!isOnline) {
      toast.error("Cannot mark as paid while offline");
      return;
    }
    await markFullPaid(id);
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transactions</h1>
        {mainTab === "suppliers" && transactions.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        )}
      </div>

      {/* Main Tabs: Customers (Udhar) / Suppliers */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers" className="gap-1.5">
            <Users className="h-4 w-4" />
            Customers (Udhar)
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1.5">
            <Store className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
        </TabsList>

        {/* Customers (Udhar) Tab */}
        <TabsContent value="customers" className="space-y-4 mt-4">
          {/* Add Udhar Button */}
          <Card
            className={`cursor-pointer transition-colors border-dashed border-2 ${
              isOnline
                ? "hover:bg-accent/50 hover:border-primary/50"
                : "opacity-50 cursor-not-allowed"
            }`}
            onClick={() => {
              if (!isOnline) {
                toast.error("Cannot add while offline");
                return;
              }
              setUdharToEdit(null);
              setUdharFormOpen(true);
            }}
          >
            <CardContent className="p-4 flex items-center justify-center gap-3 h-20">
              <div className="rounded-full bg-amber-500/10 p-2">
                <Plus className="h-5 w-5 text-amber-600" />
              </div>
              <span className="font-medium">Add New Udhar</span>
            </CardContent>
          </Card>

          {/* Filters for Udhar */}
          <div className="flex flex-wrap gap-2 items-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                {DATE_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> By Date
                  </span>
                </SelectItem>
                <SelectItem value="amount-high">
                  <span className="flex items-center gap-1">
                    <SortDesc className="h-3 w-3" /> Amount: High
                  </span>
                </SelectItem>
                <SelectItem value="amount-low">
                  <span className="flex items-center gap-1">
                    <SortAsc className="h-3 w-3" /> Amount: Low
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {(dateFilter !== "all" ||
              customerFilter !== "all" ||
              sortOrder !== "date") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFilter("all");
                  setCustomerFilter("all");
                  setSortOrder("date");
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Udhar List */}
          <UdharList
            udharList={filteredUdhar}
            customers={customers}
            onEdit={handleEditUdhar}
            onDelete={handleDeleteUdhar}
            onDeposit={handleDeposit}
            onFullPaid={handleFullPaid}
            loading={udharLoading}
          />
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4 mt-4">
          {/* Quick Action Tiles */}
          <div className="grid grid-cols-2 gap-3">
            <QuickBillCapture
              suppliers={suppliers}
              onCapture={handleQuickCapture}
              disabled={suppliers.length === 0 || !isOnline}
              variant="tile"
            />
            <Card
              className={`cursor-pointer transition-colors border-dashed border-2 ${
                isOnline
                  ? "hover:bg-accent/50 hover:border-primary/50"
                  : "opacity-50 cursor-not-allowed"
              }`}
              onClick={openAddForm}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full min-h-[100px]">
                <div className="rounded-full bg-primary/10 p-3">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-center">
                  Add Transaction
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.companyName || supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(statusFilter !== "all" || supplierFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setSupplierFilter("all");
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Sub-Tabs for List and Gallery view */}
          <Tabs
            value={activeSubTab}
            onValueChange={setActiveSubTab}
            className="space-y-4"
          >
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="gallery" className="gap-1.5">
                <Image alt="Gallery" className="h-4 w-4" />
                Bills
                {totalBills > 0 && (
                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                    {totalBills}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4 mt-0">
              {filteredTransactions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Receipt className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No transactions found</p>
                    {statusFilter !== "all" || supplierFilter !== "all" ? (
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => {
                          setStatusFilter("all");
                          setSupplierFilter("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : (
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={openAddForm}
                        disabled={!isOnline}
                      >
                        Add your first transaction
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <TransactionTable
                  transactions={filteredTransactions}
                  suppliers={suppliers}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteClick}
                  loading={transactionsLoading}
                />
              )}
            </TabsContent>

            <TabsContent value="gallery" className="space-y-4 mt-0">
              <BillGallery
                transactions={filteredTransactions}
                suppliers={suppliers}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Supplier Transaction Form */}
      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={(open) => {
          setTransactionFormOpen(open);
          if (!open) {
            setTransactionToEdit(null);
            setQuickCaptureData(null);
          }
        }}
        onSubmit={
          transactionToEdit ? handleUpdateTransaction : handleAddTransaction
        }
        suppliers={suppliers}
        initialData={transactionToEdit}
        quickCaptureData={quickCaptureData}
        title={transactionToEdit ? "Edit Transaction" : "Add Transaction"}
      />

      {/* Udhar Form */}
      <UdharForm
        open={udharFormOpen}
        onOpenChange={(open) => {
          setUdharFormOpen(open);
          if (!open) {
            setUdharToEdit(null);
          }
        }}
        onSubmit={udharToEdit ? handleUpdateUdhar : handleAddUdhar}
        onAddCustomer={addCustomer}
        customers={customers}
        initialData={udharToEdit}
        title={udharToEdit ? "Edit Udhar" : "Add Udhar"}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        description="This action cannot be undone."
        itemName={
          transactionToDelete
            ? `₹${transactionToDelete.amount?.toLocaleString()}`
            : ""
        }
      />
    </div>
  );
}
