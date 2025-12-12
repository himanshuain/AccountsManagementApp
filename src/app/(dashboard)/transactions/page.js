"use client";

import { useState } from "react";
import { Plus, Receipt, Filter, Image, List, Download } from "lucide-react";
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
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionTable } from "@/components/TransactionTable";
import { BillGallery } from "@/components/BillGallery";
import { QuickBillCapture } from "@/components/QuickBillCapture";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { exportTransactions } from "@/lib/export";
import { toast } from "sonner";

export default function TransactionsPage() {
  const isOnline = useOnlineStatus();
  const { suppliers } = useSuppliers();
  const {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();

  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("list");
  const [quickCaptureData, setQuickCaptureData] = useState(null);

  // Apply filters
  const filteredTransactions = transactions.filter((t) => {
    if (statusFilter !== "all" && t.paymentStatus !== statusFilter)
      return false;
    if (supplierFilter !== "all" && t.supplierId !== supplierFilter)
      return false;
    return true;
  });

  // Calculate stats
  const totalAmount = filteredTransactions.reduce(
    (sum, t) => sum + (t.amount || 0),
    0,
  );
  const paidAmount = filteredTransactions
    .filter((t) => t.paymentStatus === "paid")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingAmount = filteredTransactions
    .filter((t) => t.paymentStatus !== "paid")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Count bills
  const totalBills = filteredTransactions.reduce(
    (count, t) => count + (t.billImages?.length || 0),
    0,
  );

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

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Transactions</h1>
        {transactions.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        )}
      </div>

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

      {/* Tabs for List and Gallery view */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
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

        {/* Transactions List Tab */}
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
              loading={loading}
            />
          )}
        </TabsContent>

        {/* Bill Gallery Tab */}
        <TabsContent value="gallery" className="space-y-4 mt-0">
          <BillGallery
            transactions={filteredTransactions}
            suppliers={suppliers}
          />
        </TabsContent>
      </Tabs>

      {/* Transaction Form */}
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
