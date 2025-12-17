/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Plus, Users, X, FileText, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { SupplierForm } from "@/components/SupplierForm";
import { TransactionForm } from "@/components/TransactionForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageGalleryViewer } from "@/components/ImageViewer";
import { useSupplierFilters } from "@/hooks/useSupplierFilters";
import { FilterChips } from "@/components/suppliers/FilterChips";
import { SupplierList } from "@/components/suppliers/SupplierList";
import { SupplierDetailDrawer } from "@/components/suppliers/SupplierDetailDrawer";
import { TransactionsSection } from "@/components/suppliers/TransactionsSection";
import { PaymentSheet } from "@/components/suppliers/PaymentSheet";
import { PDFExportSheet } from "@/components/suppliers/PDFExportSheet";

export default function SuppliersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    recordPayment,
    markFullPaid,
  } = useTransactions();

  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState("");
  const [pdfExportSheetOpen, setPdfExportSheetOpen] = useState(false);

  // Filter chips state for mobile-first UX
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("smart");

  // Ref to track if image viewer was just closed (to prevent drawer from closing)
  const imageViewerJustClosedRef = useRef(false);

  // Transaction management states
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [txnDeleteDialogOpen, setTxnDeleteDialogOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [transactionToPay, setTransactionToPay] = useState(null);

  // Bill gallery viewer
  const [billGalleryOpen, setBillGalleryOpen] = useState(false);
  const [billGalleryImages, setBillGalleryImages] = useState([]);

  // Collapsible sections state
  const [profilesExpanded, setProfilesExpanded] = useState(true);
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);

  // Calculate stats for each supplier
  const suppliersWithStats = useMemo(() => {
    return suppliers.map(supplier => {
      const supplierTransactions = transactions.filter(t => t.supplierId === supplier.id);
      const totalAmount = supplierTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const paidAmount = supplierTransactions.reduce((sum, t) => {
        if (t.paymentStatus === "paid") return sum + (Number(t.amount) || 0);
        if (t.paymentStatus === "partial") return sum + (Number(t.paidAmount) || 0);
        return sum;
      }, 0);
      const pendingAmount = totalAmount - paidAmount;
      
      // Get the last transaction date for sorting
      const lastTransactionDate = supplierTransactions.length > 0
        ? supplierTransactions.reduce((latest, t) => {
            const tDate = new Date(t.date || t.createdAt || 0);
            return tDate > latest ? tDate : latest;
          }, new Date(0))
        : new Date(supplier.createdAt || 0);

      return {
        ...supplier,
        transactionCount: supplierTransactions.length,
        totalAmount,
        paidAmount,
        pendingAmount,
        lastTransactionDate,
      };
    });
  }, [suppliers, transactions]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalAmount = suppliersWithStats.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPaid = suppliersWithStats.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalPending = suppliersWithStats.reduce((sum, s) => sum + s.pendingAmount, 0);
    const pendingCount = suppliersWithStats.filter(s => s.pendingAmount > 0 && s.paidAmount === 0).length;
    const partialCount = suppliersWithStats.filter(s => s.pendingAmount > 0 && s.paidAmount > 0).length;
    const paidCount = suppliersWithStats.filter(s => s.pendingAmount === 0 && s.totalAmount > 0).length;
    const highAmountCount = suppliersWithStats.filter(s => s.pendingAmount >= 10000).length;
    return { totalAmount, totalPaid, totalPending, pendingCount, partialCount, paidCount, highAmountCount };
  }, [suppliersWithStats]);

  // Use the custom hook for filtering
  const filteredSuppliers = useSupplierFilters(suppliersWithStats, searchQuery, activeFilter, sortOrder);

  // Handle opening supplier from URL query parameter (e.g., from global search)
  useEffect(() => {
    const openSupplierId = searchParams.get("open");
    if (openSupplierId && suppliersWithStats.length > 0 && !loading) {
      const supplierToOpen = suppliersWithStats.find(s => s.id === openSupplierId);
      if (supplierToOpen) {
        setSelectedSupplier(supplierToOpen);
        router.replace("/suppliers", { scroll: false });
      }
    }
  }, [searchParams, suppliersWithStats, loading, router]);

  // Keep selectedSupplier in sync with updated data (fixes totalAmount not updating after transaction)
  useEffect(() => {
    if (selectedSupplier) {
      const updatedSupplier = suppliersWithStats.find(s => s.id === selectedSupplier.id);
      if (updatedSupplier && (
        updatedSupplier.totalAmount !== selectedSupplier.totalAmount ||
        updatedSupplier.paidAmount !== selectedSupplier.paidAmount ||
        updatedSupplier.pendingAmount !== selectedSupplier.pendingAmount ||
        updatedSupplier.transactionCount !== selectedSupplier.transactionCount
      )) {
        setSelectedSupplier(updatedSupplier);
      }
    }
  }, [suppliersWithStats, selectedSupplier]);

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setSortOrder("smart");
  };

  // Handle sort change
  const handleSortChange = (order) => {
    setSortOrder(order);
  };

  const handleSearch = e => {
    setSearchQuery(e.target.value);
  };

  const handleAddSupplier = async data => {
    if (!isOnline) {
      toast.error("Cannot add supplier while offline");
      return;
    }
    const result = await addSupplier(data);
    if (result.success) {
      toast.success("Supplier added successfully");
    } else {
      toast.error("Failed to add supplier");
    }
  };

  const handleUpdateSupplier = async data => {
    if (!isOnline) {
      toast.error("Cannot update supplier while offline");
      return;
    }
    if (!editingSupplier) return;
    const result = await updateSupplier(editingSupplier.id, data);
    if (result.success) {
      toast.success("Supplier updated successfully");
      if (selectedSupplier?.id === editingSupplier.id) {
        setSelectedSupplier(prev => ({ ...prev, ...data }));
      }
      setEditingSupplier(null);
      setSupplierFormOpen(false);
    } else {
      toast.error("Failed to update supplier");
    }
  };

  const handleConfirmDelete = async () => {
    if (!isOnline) {
      toast.error("Cannot delete while offline");
      return;
    }
    if (supplierToDelete) {
      const result = await deleteSupplier(supplierToDelete.id);
      if (result.success) {
        toast.success("Supplier deleted successfully");
      } else {
        toast.error("Failed to delete supplier");
      }
      setSupplierToDelete(null);
    }
  };

  const handleSupplierClick = supplier => {
    setSelectedSupplier(supplier);
  };

  const handleEditSupplier = supplier => {
    setEditingSupplier(supplier);
    setSupplierFormOpen(true);
  };

  // Transaction handlers
  const handleEditTransaction = (txn, e) => {
    e?.stopPropagation();
    if (!isOnline) {
      toast.error("Cannot edit while offline");
      return;
    }
    setTransactionToEdit(txn);
    setTransactionFormOpen(true);
  };

  const handleDeleteTransaction = (txn, e) => {
    e?.stopPropagation();
    if (!isOnline) {
      toast.error("Cannot delete while offline");
      return;
    }
    setTransactionToDelete(txn);
    setTxnDeleteDialogOpen(true);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (transactionToDelete) {
      const result = await deleteTransaction(transactionToDelete.id);
      if (result.success) {
        toast.success("Transaction deleted");
      } else {
        toast.error("Failed to delete transaction");
      }
      setTransactionToDelete(null);
      setTxnDeleteDialogOpen(false);
    }
  };

  const handlePayTransaction = (txn, e) => {
    e?.stopPropagation();
    if (!isOnline) {
      toast.error("Cannot record payment while offline");
      return;
    }
    setTransactionToPay(txn);
    setPaymentSheetOpen(true);
  };

  const handleRecordPayment = async (txnId, amount, receipt) => {
    const result = await recordPayment(txnId, amount, receipt);
    if (result.success) {
      setPaymentSheetOpen(false);
      setTransactionToPay(null);
    }
    return result;
  };

  const handleMarkFullPaid = async (txnId, receipt) => {
    const result = await markFullPaid(txnId, receipt);
    if (result.success) {
      setPaymentSheetOpen(false);
      setTransactionToPay(null);
    }
    return result;
  };

  const handleViewBillImages = (images, e) => {
    e?.stopPropagation();
    if (images && images.length > 0) {
      setBillGalleryImages(images);
      setBillGalleryOpen(true);
    }
  };

  const handleAddTransaction = async data => {
    if (!isOnline) {
      toast.error("Cannot add transaction while offline");
      return;
    }
    const result = await addTransaction(data);
    if (result.success) {
      toast.success("Transaction added");
      setTransactionFormOpen(false);
    } else {
      toast.error("Failed to add transaction");
    }
  };

  const handleUpdateTransaction = async data => {
    if (!isOnline || !transactionToEdit) {
      toast.error("Cannot update while offline");
      return;
    }
    const result = await updateTransaction(transactionToEdit.id, data);
    if (result.success) {
      toast.success("Transaction updated");
      setTransactionToEdit(null);
      setTransactionFormOpen(false);
    } else {
      toast.error("Failed to update transaction");
    }
  };

  const openAddForm = () => {
    if (!isOnline) {
      toast.error("Cannot add supplier while offline");
      return;
    }
    setSupplierFormOpen(true);
  };

  return (
    <div className="space-y-3 p-4 lg:p-6">
      {/* Header - Simplified */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Vyapari</h1>
        <div className="flex gap-2">
          {suppliers.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPdfExportSheetOpen(true)}
              className="touch-manipulation"
            >
              <FileText className="mr-1 h-4 w-4" />
              PDF
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={openAddForm} 
            disabled={!isOnline}
            className="touch-manipulation"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* HERO: Pending Amount Card - Most Important */}
      {summaryStats.totalPending > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                  Total Pending
                </p>
                <p className="text-3xl font-bold text-amber-600">
                  ₹{summaryStats.totalPending.toLocaleString()}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Paid: <span className="font-medium text-green-600">₹{summaryStats.totalPaid.toLocaleString()}</span></p>
                <p>Total: ₹{summaryStats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search - Context-aware placeholder */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name or amount..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-9 h-11 text-base touch-manipulation"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 touch-manipulation"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Chips */}
      <FilterChips
        activeFilter={activeFilter}
        sortOrder={sortOrder}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
        summaryStats={summaryStats}
        totalCount={suppliers.length}
      />

      {/* Profiles Section - Collapsible */}
      <Collapsible open={profilesExpanded} onOpenChange={setProfilesExpanded}>
        <CollapsibleTrigger asChild>
          <button className="sticky top-14 z-20 -mx-4 flex w-[calc(100%+2rem)] items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur transition-colors hover:bg-muted/50 supports-[backdrop-filter]:bg-background/80 lg:top-[57px] touch-manipulation">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold">Vyapari Profiles</span>
              <Badge 
                key={`${filteredSuppliers.length}-${activeFilter}-${sortOrder}`}
                variant="secondary" 
                className="text-xs animate-pop-in"
              >
                {filteredSuppliers.length}
              </Badge>
              {(activeFilter !== "all" || sortOrder !== "smart") && (
                <Badge variant="outline" className="text-xs text-muted-foreground animate-pop-in">
                  {activeFilter !== "all" && activeFilter}
                  {activeFilter !== "all" && sortOrder !== "smart" && " · "}
                  {sortOrder !== "smart" && sortOrder}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                profilesExpanded && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SupplierList
            suppliers={filteredSuppliers}
            transactions={transactions}
            loading={loading}
            searchQuery={searchQuery}
            activeFilter={activeFilter}
            sortOrder={sortOrder}
            onSupplierClick={handleSupplierClick}
            onAddClick={openAddForm}
            isOnline={isOnline}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* All Transactions & Bills Section */}
      <TransactionsSection
        transactions={transactions}
        suppliers={suppliers}
        isExpanded={transactionsExpanded}
        onExpandedChange={setTransactionsExpanded}
        onEditTransaction={(txn) => {
          if (!isOnline) {
            toast.error("Cannot edit while offline");
            return;
          }
          setTransactionToEdit(txn);
          setTransactionFormOpen(true);
        }}
        onDeleteTransaction={(txn) => {
          if (!isOnline) {
            toast.error("Cannot delete while offline");
            return;
          }
          setTransactionToDelete(txn);
          setTxnDeleteDialogOpen(true);
        }}
        isOnline={isOnline}
      />

      {/* Supplier Detail Drawer */}
      <SupplierDetailDrawer
        supplier={selectedSupplier}
        transactions={transactions}
        isOnline={isOnline}
        onEdit={handleEditSupplier}
        onDelete={(supplier) => {
          setSupplierToDelete(supplier);
          setDeleteDialogOpen(true);
        }}
        onAddTransaction={() => {
          setTransactionToEdit(null);
          setTransactionFormOpen(true);
        }}
        onEditTransaction={handleEditTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        onPayTransaction={handlePayTransaction}
        onViewBillImages={handleViewBillImages}
        onClose={() => setSelectedSupplier(null)}
        imageViewerOpen={imageViewerOpen}
        setImageViewerOpen={setImageViewerOpen}
        imageViewerSrc={imageViewerSrc}
        setImageViewerSrc={setImageViewerSrc}
        imageViewerJustClosedRef={imageViewerJustClosedRef}
      />

      {/* Bill Gallery Viewer */}
      <ImageGalleryViewer
        open={billGalleryOpen}
        onOpenChange={setBillGalleryOpen}
        images={billGalleryImages}
      />

      {/* Supplier Form (Add/Edit) */}
      <SupplierForm
        open={supplierFormOpen}
        onOpenChange={open => {
          setSupplierFormOpen(open);
          if (!open) setEditingSupplier(null);
        }}
        onSubmit={editingSupplier ? handleUpdateSupplier : handleAddSupplier}
        initialData={editingSupplier}
        title={editingSupplier ? "Edit Vyapari" : "Add Vyapari"}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? All their transactions will also be deleted. This action cannot be undone."
        itemName={supplierToDelete?.name}
      />

      {/* Transaction Form (Add/Edit) */}
      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={open => {
          setTransactionFormOpen(open);
          if (!open) setTransactionToEdit(null);
        }}
        onSubmit={transactionToEdit ? handleUpdateTransaction : handleAddTransaction}
        initialData={transactionToEdit}
        suppliers={suppliers}
        defaultSupplierId={selectedSupplier?.id}
      />

      {/* Transaction Delete Confirmation */}
      <DeleteConfirmDialog
        open={txnDeleteDialogOpen}
        onOpenChange={setTxnDeleteDialogOpen}
        onConfirm={handleConfirmDeleteTransaction}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        itemName={
          transactionToDelete?.itemName || `₹${transactionToDelete?.amount?.toLocaleString()}`
        }
      />

      {/* Payment Sheet */}
      <PaymentSheet
        open={paymentSheetOpen}
        onOpenChange={setPaymentSheetOpen}
        transaction={transactionToPay}
        onRecordPayment={handleRecordPayment}
        onMarkFullPaid={handleMarkFullPaid}
      />

      {/* PDF Export Sheet */}
      <PDFExportSheet
        open={pdfExportSheetOpen}
        onOpenChange={setPdfExportSheetOpen}
        suppliers={suppliersWithStats}
        transactions={transactions}
      />
    </div>
  );
}
