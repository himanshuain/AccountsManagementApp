/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Receipt,
  Filter,
  Image,
  List,
  Users,
  Store,
  SortAsc,
  SortDesc,
  Calendar,
  Trash2,
  AlertTriangle,
  MoreVertical,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionTable } from "@/components/TransactionTable";
import { BillGallery } from "@/components/BillGallery";
import { QuickBillCapture } from "@/components/QuickBillCapture";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { UdharForm } from "@/components/UdharForm";
import { UdharList } from "@/components/UdharList";
import { CustomerForm } from "@/components/CustomerForm";
import { ImageGalleryViewer } from "@/components/ImageViewer";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    totalCount: transactionsTotalCount,
    fetchNextPage: fetchNextTransactions,
    hasNextPage: hasMoreTransactions,
    isFetchingNextPage: isFetchingMoreTransactions,
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
    deletePayment,
    totalCount: udharTotalCount,
    fetchNextPage: fetchNextUdhar,
    hasNextPage: hasMoreUdhar,
    isFetchingNextPage: isFetchingMoreUdhar,
  } = useUdhar();

  // Tab state - read from URL, localStorage, or default to customers
  const [mainTab, setMainTab] = useState(() => {
    // On client side, try to read from localStorage
    if (typeof window !== "undefined") {
      return localStorage.getItem("transactionsTab") || "customers";
    }
    return "customers";
  });

  // Persist tab selection to localStorage
  const handleTabChange = tab => {
    setMainTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("transactionsTab", tab);
    }
  };

  // Read tab from URL query params (overrides localStorage)
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

  // Supplier transaction sort state
  const [supplierSortOrder, setSupplierSortOrder] = useState("date"); // date, amount-high, amount-low

  // Bulk delete state for supplier transactions
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteOption, setBulkDeleteOption] = useState("6months");
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // All receipts view state
  const [allReceiptsSheetOpen, setAllReceiptsSheetOpen] = useState(false);
  const [receiptGalleryOpen, setReceiptGalleryOpen] = useState(false);
  const [receiptGalleryImages, setReceiptGalleryImages] = useState([]);
  const [receiptGalleryInitialIndex, setReceiptGalleryInitialIndex] = useState(0);

  // Collect all receipts from udhar payments
  const allReceipts = useMemo(() => {
    const receipts = [];
    udharList.forEach(udhar => {
      // Add khata/bill photos
      if (udhar.khataPhotos?.length > 0) {
        udhar.khataPhotos.forEach(photo => {
          receipts.push({
            url: photo,
            type: "bill",
            date: udhar.date,
            customerName: customers.find(c => c.id === udhar.customerId)?.name || "Unknown",
            amount: udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0),
          });
        });
      }
      if (udhar.billImages?.length > 0) {
        udhar.billImages.forEach(photo => {
          receipts.push({
            url: photo,
            type: "bill",
            date: udhar.date,
            customerName: customers.find(c => c.id === udhar.customerId)?.name || "Unknown",
            amount: udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0),
          });
        });
      }
      // Add payment receipts
      if (udhar.payments?.length > 0) {
        udhar.payments.forEach(payment => {
          if (payment.receiptUrl) {
            receipts.push({
              url: payment.receiptUrl,
              type: "receipt",
              date: payment.date,
              customerName: customers.find(c => c.id === udhar.customerId)?.name || "Unknown",
              amount: payment.amount,
            });
          }
        });
      }
    });
    // Sort by date, newest first
    return receipts.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [udharList, customers]);

  // Filter and sort supplier transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(t => {
      if (statusFilter !== "all" && t.paymentStatus !== statusFilter) return false;
      if (supplierFilter !== "all" && t.supplierId !== supplierFilter) return false;
      return true;
    });

    // Sort
    if (supplierSortOrder === "amount-high") {
      filtered = [...filtered].sort((a, b) => {
        const amountA = Number(a.amount) || 0;
        const amountB = Number(b.amount) || 0;
        return amountB - amountA;
      });
    } else if (supplierSortOrder === "amount-low") {
      filtered = [...filtered].sort((a, b) => {
        const amountA = Number(a.amount) || 0;
        const amountB = Number(b.amount) || 0;
        return amountA - amountB;
      });
    } else {
      // Default: sort by date (newest first)
      filtered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return filtered;
  }, [transactions, statusFilter, supplierFilter, supplierSortOrder]);

  // Filter and sort Udhar
  const filteredUdhar = useMemo(() => {
    let filtered = [...udharList];

    // Date filter
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      filtered = filtered.filter(u => new Date(u.date) >= startDate);
    }

    // Customer filter
    if (customerFilter !== "all") {
      filtered = filtered.filter(u => u.customerId === customerFilter);
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
    0
  );

  // Supplier transaction handlers
  const handleAddTransaction = async data => {
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

  const handleEditTransaction = transaction => {
    if (!isOnline) {
      toast.error("Cannot edit while offline");
      return;
    }
    setTransactionToEdit(transaction);
    setTransactionFormOpen(true);
  };

  const handleUpdateTransaction = async data => {
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

  const handleDeleteClick = transaction => {
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
  const handleAddUdhar = async data => {
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

  const handleEditUdhar = udhar => {
    if (!isOnline) {
      toast.error("Cannot edit while offline");
      return;
    }
    setUdharToEdit(udhar);
    setUdharFormOpen(true);
  };

  const handleUpdateUdhar = async data => {
    if (!isOnline) return;
    const result = await updateUdhar(udharToEdit.id, data);
    if (result.success) {
      toast.success("Udhar updated");
      setUdharToEdit(null);
    } else {
      toast.error("Failed to update");
    }
  };

  const handleDeleteUdhar = async udhar => {
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

  const handleFullPaid = async id => {
    if (!isOnline) {
      toast.error("Cannot mark as paid while offline");
      return;
    }
    await markFullPaid(id);
  };

  // Bulk delete functions for supplier transactions
  const getTransactionsToDelete = () => {
    const now = new Date();
    let cutoffDate;

    switch (bulkDeleteOption) {
      case "6months":
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case "1year":
        cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case "previousYear":
        cutoffDate = new Date(now.getFullYear() - 1, 11, 31); // End of previous year
        break;
      case "all":
        return transactions;
      default:
        cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
    }

    return transactions.filter(t => new Date(t.date) < cutoffDate);
  };

  const handleBulkDeleteConfirm = async () => {
    const transactionsToDelete = getTransactionsToDelete();
    if (transactionsToDelete.length === 0) {
      toast.error("No transactions match the selected criteria");
      return;
    }

    let successCount = 0;
    for (const transaction of transactionsToDelete) {
      const result = await deleteTransaction(transaction.id);
      if (result.success) {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} transactions`);
    } else {
      toast.error("Failed to delete transactions");
    }

    setBulkDeleteConfirmOpen(false);
    setBulkDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transactions</h1>
        {mainTab === "suppliers" && transactions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={!isOnline}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Bulk Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Main Tabs: Customers (Udhar) / Suppliers */}
      <Tabs value={mainTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 bg-blue-900">
          <TabsTrigger value="customers" className="gap-1.5">
            <Users className="h-4 w-4" />
            Customers (Udhar)
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1.5">
            <Store className="h-4 w-4" />
            Vyapari
          </TabsTrigger>
        </TabsList>

        {/* Customers (Udhar) Tab */}
        <TabsContent value="customers" className="mt-4 space-y-4">
          {/* Stats Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                {filteredUdhar.length} Transaction{filteredUdhar.length !== 1 ? "s" : ""}
              </Badge>
              {allReceipts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setAllReceiptsSheetOpen(true)}
                >
                  <Receipt className="h-4 w-4" />
                  All Receipts ({allReceipts.length})
                </Button>
              )}
            </div>
          </div>

          {/* Add Udhar Button */}
          <Card
            className={`cursor-pointer border-2 border-dashed transition-colors ${
              isOnline
                ? "hover:border-primary/50 hover:bg-accent/50"
                : "cursor-not-allowed opacity-50"
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
            <CardContent className="flex h-20 items-center justify-center gap-3 p-4">
              <div className="rounded-full bg-amber-500/10 p-2">
                <Plus className="h-5 w-5 text-amber-600" />
              </div>
              <span className="font-medium">Add New Udhar</span>
            </CardContent>
          </Card>

          {/* Filters for Udhar */}
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                {DATE_FILTERS.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="h-9 w-[140px]">
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

            {(dateFilter !== "all" || customerFilter !== "all" || sortOrder !== "date") && (
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
            onDeletePayment={deletePayment}
            loading={udharLoading}
          />

          {/* API Infinite Scroll - fetch more udhar from server */}
          <InfiniteScrollTrigger
            onLoadMore={fetchNextUdhar}
            hasMore={hasMoreUdhar}
            isLoading={isFetchingMoreUdhar}
            loadedCount={udharList.length}
            totalCount={udharTotalCount}
          />
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.companyName || supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supplierSortOrder} onValueChange={setSupplierSortOrder}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Recent
                  </span>
                </SelectItem>
                <SelectItem value="amount-high">
                  <span className="flex items-center gap-2">
                    <SortDesc className="h-4 w-4" />
                    Amount High
                  </span>
                </SelectItem>
                <SelectItem value="amount-low">
                  <span className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    Amount Low
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {(statusFilter !== "all" ||
              supplierFilter !== "all" ||
              supplierSortOrder !== "date") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setSupplierFilter("all");
                  setSupplierSortOrder("date");
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Sub-Tabs for List and Gallery view */}
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="gallery" className="gap-1.5">
                <Image alt="Gallery" className="h-4 w-4" />
                Bills
                {totalBills > 0 && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                    {totalBills}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-0 space-y-4">
              {filteredTransactions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Receipt className="mx-auto mb-2 h-10 w-10 opacity-50" />
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
                <>
                  <TransactionTable
                    transactions={filteredTransactions}
                    suppliers={suppliers}
                    onEdit={handleEditTransaction}
                    onDelete={handleDeleteClick}
                    loading={transactionsLoading}
                  />

                  {/* API Infinite Scroll - fetch more transactions from server */}
                  <InfiniteScrollTrigger
                    onLoadMore={fetchNextTransactions}
                    hasMore={hasMoreTransactions}
                    isLoading={isFetchingMoreTransactions}
                    loadedCount={transactions.length}
                    totalCount={transactionsTotalCount}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="gallery" className="mt-0 space-y-4">
              <BillGallery transactions={filteredTransactions} suppliers={suppliers} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Supplier Transaction Form */}
      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={open => {
          setTransactionFormOpen(open);
          if (!open) {
            setTransactionToEdit(null);
            setQuickCaptureData(null);
          }
        }}
        onSubmit={transactionToEdit ? handleUpdateTransaction : handleAddTransaction}
        suppliers={suppliers}
        initialData={transactionToEdit}
        quickCaptureData={quickCaptureData}
        title={transactionToEdit ? "Edit Transaction" : "Add Transaction"}
      />

      {/* Udhar Form */}
      <UdharForm
        open={udharFormOpen}
        onOpenChange={open => {
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
        itemName={transactionToDelete ? `₹${transactionToDelete.amount?.toLocaleString()}` : ""}
      />

      {/* Bulk Delete Dialog */}
      <Sheet open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[80vh] flex-col rounded-t-2xl p-0"
          hideClose
        >
          {/* Drag handle */}
          <div className="flex justify-center pb-2 pt-3" data-drag-handle>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-6 pb-4">
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Bulk Delete Transactions
            </SheetTitle>
            <SheetDescription>
              Permanently delete multiple supplier transactions. This action cannot be undone.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              {/* Delete Options */}
              <div className="space-y-2">
                <Label>Select transactions to delete</Label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                    <input
                      type="radio"
                      name="bulkDelete"
                      value="6months"
                      checked={bulkDeleteOption === "6months"}
                      onChange={e => setBulkDeleteOption(e.target.value)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Older than 6 months</span>
                      <p className="text-xs text-muted-foreground">
                        {
                          transactions.filter(
                            t =>
                              new Date(t.date) <
                              new Date(new Date().setMonth(new Date().getMonth() - 6))
                          ).length
                        }{" "}
                        transactions
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                    <input
                      type="radio"
                      name="bulkDelete"
                      value="1year"
                      checked={bulkDeleteOption === "1year"}
                      onChange={e => setBulkDeleteOption(e.target.value)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Older than 1 year</span>
                      <p className="text-xs text-muted-foreground">
                        {
                          transactions.filter(
                            t =>
                              new Date(t.date) <
                              new Date(new Date().setFullYear(new Date().getFullYear() - 1))
                          ).length
                        }{" "}
                        transactions
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                    <input
                      type="radio"
                      name="bulkDelete"
                      value="previousYear"
                      checked={bulkDeleteOption === "previousYear"}
                      onChange={e => setBulkDeleteOption(e.target.value)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">
                        Previous year ({new Date().getFullYear() - 1})
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {
                          transactions.filter(
                            t => new Date(t.date) < new Date(new Date().getFullYear() - 1, 11, 31)
                          ).length
                        }{" "}
                        transactions
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-destructive/30 p-3 hover:bg-destructive/5">
                    <input
                      type="radio"
                      name="bulkDelete"
                      value="all"
                      checked={bulkDeleteOption === "all"}
                      onChange={e => setBulkDeleteOption(e.target.value)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-destructive">All transactions</span>
                      <p className="text-xs text-muted-foreground">
                        {transactions.length} transactions (entire history)
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="safe-area-bottom sticky bottom-0 z-10 border-t bg-background px-6 py-4">
            <div className="flex w-full gap-3">
              <Button
                variant="outline"
                onClick={() => setBulkDeleteDialogOpen(false)}
                className="h-12 flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setBulkDeleteConfirmOpen(true)}
                disabled={!isOnline || getTransactionsToDelete().length === 0}
                className="h-12 flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {getTransactionsToDelete().length} Transactions
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {getTransactionsToDelete().length} transactions. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* All Receipts Sheet */}
      <Sheet
        open={allReceiptsSheetOpen}
        onOpenChange={open => {
          // Only close if image viewer is not open
          if (!open && receiptGalleryOpen) return;
          setAllReceiptsSheetOpen(open);
        }}
      >
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0" hideClose>
          <SheetHeader className="border-b p-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                All Receipts & Bills ({allReceipts.length})
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setAllReceiptsSheetOpen(false)}>
                <span className="sr-only">Close</span>×
              </Button>
            </div>
          </SheetHeader>
          <ScrollArea className="h-[calc(85vh-80px)]">
            <div className="p-4">
              {allReceipts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Receipt className="mx-auto mb-3 h-12 w-12 opacity-50" />
                  <p>No receipts or bills found</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {allReceipts.map((receipt, idx) => (
                    <div
                      key={idx}
                      className="relative cursor-pointer overflow-hidden rounded-lg border bg-muted"
                      onClick={() => {
                        setReceiptGalleryImages(allReceipts.map(r => r.url));
                        setReceiptGalleryInitialIndex(idx);
                        setReceiptGalleryOpen(true);
                      }}
                    >
                      <div className="aspect-square">
                        <img
                          src={receipt.url}
                          alt={`${receipt.type} ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      {/* Info always visible */}
                      <div className="border-t bg-card p-2">
                        <p className="truncate text-xs font-medium">{receipt.customerName}</p>
                        <div className="mt-0.5 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            ₹{receipt.amount?.toLocaleString()}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`px-1.5 py-0 text-[10px] ${
                              receipt.type === "receipt"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {receipt.type === "receipt" ? "Receipt" : "Bill"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Receipt Gallery Viewer */}
      <ImageGalleryViewer
        images={receiptGalleryImages}
        initialIndex={receiptGalleryInitialIndex}
        open={receiptGalleryOpen}
        onOpenChange={setReceiptGalleryOpen}
      />
    </div>
  );
}
