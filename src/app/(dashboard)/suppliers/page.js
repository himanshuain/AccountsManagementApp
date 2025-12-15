/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Users,
  Phone,
  MapPin,
  IndianRupee,
  X,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  FileText,
  CreditCard,
  Clock,
  CheckCircle,
  CheckCircle2,
  MoreVertical,
  Image as ImageIcon,
  Receipt,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { SupplierForm } from "@/components/SupplierForm";
import { TransactionForm } from "@/components/TransactionForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { exportSupplierTransactionsPDF } from "@/lib/export";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageViewer, ImageGalleryViewer } from "@/components/ImageViewer";
import { ImageUpload } from "@/components/ImageUpload";
import { Label } from "@/components/ui/label";

export default function SuppliersPage() {
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
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);

  // Transaction management states
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [txnDeleteDialogOpen, setTxnDeleteDialogOpen] = useState(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [transactionToPay, setTransactionToPay] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  
  // Bill gallery viewer
  const [billGalleryOpen, setBillGalleryOpen] = useState(false);
  const [billGalleryImages, setBillGalleryImages] = useState([]);

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
      return {
        ...supplier,
        transactionCount: supplierTransactions.length,
        totalAmount,
        paidAmount,
        pendingAmount,
      };
    });
  }, [suppliers, transactions]);

  // Filter suppliers based on search
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliersWithStats;
    const query = searchQuery.toLowerCase();
    return suppliersWithStats.filter(
      s =>
        s.name?.toLowerCase().includes(query) ||
        s.companyName?.toLowerCase().includes(query) ||
        s.phone?.includes(query)
    );
  }, [suppliersWithStats, searchQuery]);

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
      setEditingSupplier(null);
      setSupplierFormOpen(false);
    } else {
      toast.error("Failed to update supplier");
    }
  };

  const handleDeleteClick = (supplier, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!isOnline) {
      toast.error("Cannot delete while offline");
      return;
    }
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
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
    setSelectedSupplier(null);
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
    setPaymentAmount("");
    setPaymentReceipt(null);
    setPaymentSheetOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!transactionToPay || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const result = await recordPayment(transactionToPay.id, amount, paymentReceipt);
    if (result.success) {
      toast.success("Payment recorded");
      setPaymentSheetOpen(false);
      setTransactionToPay(null);
      setPaymentAmount("");
      setPaymentReceipt(null);
    } else {
      toast.error("Failed to record payment");
    }
  };

  const handleMarkFullPaid = async () => {
    if (!transactionToPay) return;
    const result = await markFullPaid(transactionToPay.id, paymentReceipt);
    if (result.success) {
      toast.success("Marked as fully paid");
      setPaymentSheetOpen(false);
      setTransactionToPay(null);
      setPaymentReceipt(null);
    } else {
      toast.error("Failed to mark as paid");
    }
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
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vyapari</h1>
          <p className="text-muted-foreground text-sm">{suppliers.length} vyapari</p>
        </div>
        {suppliers.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setPdfExportSheetOpen(true)}>
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search vyapari..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-9"
        />
      </div>

      {/* Instagram Story-like Vyapari Grid */}
      {loading ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No vyapari yet</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "No vyapari match your search" : "Add your first vyapari to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={openAddForm} disabled={!isOnline}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vyapari
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-5">
          {/* Add New Vyapari Circle */}
          <button
            onClick={openAddForm}
            disabled={!isOnline}
            className="flex flex-col items-center gap-2 group"
          >
            <div
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-primary/50 flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 group-hover:border-primary transition-all"
              style={{ width: "72px", height: "72px" }}
            >
              <Plus className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground text-center w-full">
              Add New
            </span>
          </button>

          {/* Vyapari Circles */}
          {filteredSuppliers.map(supplier => (
            <button
              key={supplier.id}
              onClick={() => handleSupplierClick(supplier)}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={cn(
                  "rounded-full p-0.5 transition-all group-hover:scale-105 group-active:scale-95",
                  supplier.pendingAmount > 0
                    ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500"
                    : "bg-gradient-to-tr from-green-400 via-emerald-500 to-teal-500"
                )}
                style={{ width: "72px", height: "72px" }}
              >
                <div className="w-full h-full rounded-full bg-background p-0.5">
                  {supplier.profilePicture ? (
                    <img
                      src={supplier.profilePicture}
                      alt={supplier.companyName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {supplier.companyName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-center w-full max-w-[80px] leading-tight line-clamp-2">
                {supplier.companyName}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Supplier Detail Drawer */}
      <Sheet 
        open={!!selectedSupplier} 
        onOpenChange={open => {
          // Don't close if image viewer is open
          if (!open && (imageViewerOpen || billGalleryOpen)) return;
          if (!open) setSelectedSupplier(null);
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl h-[90vh] p-0" hideClose>
          {selectedSupplier &&
            (() => {
              const supplierTransactions = transactions
                .filter(t => t.supplierId === selectedSupplier.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

              const formatRelativeDate = dateStr => {
                try {
                  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
                } catch {
                  return dateStr;
                }
              };

              return (
                <>
                  {/* Drag handle */}
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                  </div>

                  {/* Header with profile and actions */}
                  <SheetHeader className="px-4 pb-3 border-b">
                    <div className="flex items-center gap-3">
                      {/* Profile Picture */}
                      <div
                        className={cn(
                          "w-14 h-14 rounded-full p-0.5 flex-shrink-0 cursor-pointer",
                          selectedSupplier.pendingAmount > 0
                            ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500"
                            : "bg-gradient-to-tr from-green-400 via-emerald-500 to-teal-500"
                        )}
                        onClick={() => {
                          if (selectedSupplier.profilePicture) {
                            setImageViewerSrc(selectedSupplier.profilePicture);
                            setImageViewerOpen(true);
                          }
                        }}
                      >
                        <div className="w-full h-full rounded-full bg-background p-0.5">
                          {selectedSupplier.profilePicture ? (
                            <img
                              src={selectedSupplier.profilePicture}
                              alt={selectedSupplier.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xl font-bold text-primary">
                                {selectedSupplier.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Name and info */}
                      <div className="flex-1 min-w-0">
                        <SheetTitle className="text-xl font-bold truncate pb-2">
                          {selectedSupplier.companyName}
                        </SheetTitle>
                        {selectedSupplier.phone && (
                          <a
                            href={`tel:${selectedSupplier.phone}`}
                            className="text-medium text-primary items-center gap-1"
                          >
                            {selectedSupplier.phone}
                          </a>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditSupplier(selectedSupplier)}
                          disabled={!isOnline}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild className="z-[100]">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                try {
                                  exportSupplierTransactionsPDF(
                                    selectedSupplier,
                                    supplierTransactions
                                  );
                                  toast.success(`PDF exported for ${selectedSupplier.companyName}`);
                                } catch (error) {
                                  console.error("PDF export failed:", error);
                                  toast.error("Failed to export PDF");
                                }
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setSupplierToDelete(selectedSupplier);
                                setDeleteDialogOpen(true);
                                setSelectedSupplier(null);
                              }}
                              disabled={!isOnline}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Vyapari
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </SheetHeader>

                  <ScrollArea className="flex-1 h-[calc(90vh-100px)]">
                    <div className="p-4 space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-xl bg-muted/50 text-center">
                          <p className="text-[10px] text-muted-foreground">Total</p>
                          <p className="text-lg font-bold">
                            ₹{(selectedSupplier.totalAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-green-500/10 text-center">
                          <p className="text-[10px] text-green-600">Paid</p>
                          <p className="text-lg font-bold text-green-600">
                            ₹{(selectedSupplier.paidAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 text-center">
                          <p className="text-[10px] text-amber-600">Pending</p>
                          <p className="text-lg font-bold text-amber-600">
                            ₹{(selectedSupplier.pendingAmount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Transactions Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">
                            Transactions ({supplierTransactions.length})
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTransactionToEdit(null);
                              setTransactionFormOpen(true);
                            }}
                            disabled={!isOnline}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        {supplierTransactions.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <IndianRupee className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>No transactions yet</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {supplierTransactions.map(txn => {
                              const amount = Number(txn.amount) || 0;
                              const paid =
                                txn.paymentStatus === "paid" ? amount : Number(txn.paidAmount) || 0;
                              const pending = amount - paid;
                              const isPaid = txn.paymentStatus === "paid";
                              const isPartial = txn.paymentStatus === "partial";
                              const hasPayments = txn.payments && txn.payments.length > 0;
                              const isExpanded = expandedTransactionId === txn.id;

                              return (
                                <Card
                                  key={txn.id}
                                  className={cn(
                                    "overflow-hidden",
                                    isPaid
                                      ? "border-l-4 border-l-green-500"
                                      : isPartial
                                      ? "border-l-4 border-l-blue-500"
                                      : "border-l-4 border-l-amber-500"
                                  )}
                                >
                                  <CardContent className="p-0">
                                    <div
                                      className={cn(
                                        "p-3 transition-colors",
                                        hasPayments && "cursor-pointer hover:bg-muted/30"
                                      )}
                                      onClick={() =>
                                        hasPayments &&
                                        setExpandedTransactionId(isExpanded ? null : txn.id)
                                      }
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-lg font-bold">
                                              ₹{amount.toLocaleString()}
                                            </span>
                                            <Badge
                                              variant="secondary"
                                              className={cn(
                                                "text-xs",
                                                isPaid
                                                  ? "bg-green-100 text-green-700"
                                                  : isPartial
                                                  ? "bg-blue-100 text-blue-700"
                                                  : "bg-amber-100 text-amber-700"
                                              )}
                                            >
                                              {isPaid ? "Paid" : isPartial ? "Partial" : "Pending"}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            {txn.date
                                              ? format(new Date(txn.date), "dd MMM yyyy")
                                              : "-"}
                                            {txn.itemName && ` • ${txn.itemName}`}
                                          </p>
                                        </div>
                                        {hasPayments && (
                                          <ChevronDown
                                            className={cn(
                                              "h-5 w-5 text-muted-foreground transition-transform",
                                              isExpanded && "rotate-180"
                                            )}
                                          />
                                        )}
                                      </div>

                                      {/* Progress bar for partial */}
                                      {isPartial && (
                                        <div className="mt-2">
                                          <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-green-600">
                                              Paid: ₹{paid.toLocaleString()}
                                            </span>
                                            <span className="text-amber-600">
                                              Pending: ₹{pending.toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-green-500 rounded-full"
                                              style={{ width: `${(paid / amount) * 100}%` }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Buttons - Always visible */}
                                    <div className="px-3 py-2 border-t bg-muted/10 flex items-center gap-2 flex-wrap">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={e => handleEditTransaction(txn, e)}
                                        disabled={!isOnline}
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Edit
                                      </Button>
                                      {!isPaid && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 text-xs text-green-600 border-green-200 hover:bg-green-50"
                                          onClick={e => handlePayTransaction(txn, e)}
                                          disabled={!isOnline}
                                        >
                                          <CreditCard className="h-3 w-3 mr-1" />
                                          Pay
                                        </Button>
                                      )}
                                      {txn.billImages && txn.billImages.length > 0 && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                          onClick={e => handleViewBillImages(txn.billImages, e)}
                                        >
                                          <ImageIcon className="h-3 w-3 mr-1" />
                                          Bills ({txn.billImages.length})
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                                        onClick={e => handleDeleteTransaction(txn, e)}
                                        disabled={!isOnline}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Delete
                                      </Button>
                                    </div>

                                    {/* Expanded Section - Payment History */}
                                    {isExpanded && hasPayments && (
                                      <div className="px-3 pb-3 border-t bg-muted/20">
                                        <div className="pt-3">
                                          <p className="text-xs font-medium text-muted-foreground mb-2">
                                            Payment History
                                          </p>
                                          <div className="space-y-0">
                                            {txn.payments
                                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                                              .map((payment, index, arr) => (
                                                <div key={payment.id} className="flex">
                                                  <div className="flex flex-col items-center mr-3">
                                                    <div
                                                      className={cn(
                                                        "w-3 h-3 rounded-full flex items-center justify-center",
                                                        index === 0
                                                          ? "bg-green-500"
                                                          : "bg-green-400"
                                                      )}
                                                    >
                                                      <CheckCircle2 className="w-2 h-2 text-white" />
                                                    </div>
                                                    {index < arr.length - 1 && (
                                                      <div className="w-0.5 h-full min-h-[20px] bg-green-300" />
                                                    )}
                                                  </div>
                                                  <div className="flex-1 pb-2">
                                                    <div className="flex items-center gap-2">
                                                      <span className="font-semibold text-green-600">
                                                        ₹{payment.amount.toLocaleString()}
                                                      </span>
                                                      <span className="text-xs text-muted-foreground">
                                                        — {formatRelativeDate(payment.date)}
                                                      </span>
                                                      {payment.receiptUrl && (
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          className="h-6 px-2 text-xs text-blue-600"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setImageViewerSrc(payment.receiptUrl);
                                                            setImageViewerOpen(true);
                                                          }}
                                                        >
                                                          <Receipt className="h-3 w-3 mr-1" />
                                                          Receipt
                                                        </Button>
                                                      )}
                                                    </div>
                                                    {payment.isFinalPayment && (
                                                      <span className="text-xs text-green-600">
                                                        Final payment
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {selectedSupplier.notes && (
                        <div className="p-3 rounded-xl bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm">{selectedSupplier.notes}</p>
                        </div>
                      )}

                      {/* UPI QR Code if available */}
                      {selectedSupplier.upiQrCode && (
                        <div className="p-3 rounded-xl bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-2">UPI QR Code</p>
                          <img
                            src={selectedSupplier.upiQrCode}
                            alt="UPI QR"
                            className="w-28 h-28 mx-auto rounded-lg cursor-pointer"
                            onClick={() => {
                              setImageViewerSrc(selectedSupplier.upiQrCode);
                              setImageViewerOpen(true);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>

      {/* Image Viewer */}
      <ImageViewer open={imageViewerOpen} onOpenChange={setImageViewerOpen} src={imageViewerSrc} />
      
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
      <Sheet open={paymentSheetOpen} onOpenChange={setPaymentSheetOpen}>
        <SheetContent side="top" className="rounded-b-2xl h-auto max-h-[70vh] p-0" hideClose>
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-4 pb-2">
            <SheetTitle>Record Payment</SheetTitle>
          </SheetHeader>

          {transactionToPay && (
            <div className="px-4 pb-6 space-y-4">
              {/* Summary */}
              <div className="p-3 rounded-xl bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">
                    ₹{Number(transactionToPay.amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="font-semibold text-green-600">
                    ₹{Number(transactionToPay.paidAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-semibold text-amber-600">
                    ₹
                    {(
                      Number(transactionToPay.amount || 0) -
                      Number(transactionToPay.paidAmount || 0)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="text-lg"
                />
              </div>

              {/* Receipt Upload */}
              <div className="space-y-2">
                <Label>Payment Receipt (Optional)</Label>
                <div className="w-24">
                  <ImageUpload
                    value={paymentReceipt}
                    onChange={setPaymentReceipt}
                    placeholder="Receipt"
                    aspectRatio="square"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleRecordPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                  onClick={handleMarkFullPaid}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Full Paid
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* PDF Export Sheet */}
      <Sheet open={pdfExportSheetOpen} onOpenChange={setPdfExportSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[70vh] p-0" hideClose>
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-4 pb-3 border-b">
            <SheetTitle className="text-lg">Export PDF Report</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Select a vyapari to export their transaction report
            </p>
          </SheetHeader>

          <ScrollArea className="flex-1 h-[calc(70vh-100px)]">
            <div className="p-4 space-y-2">
              {suppliersWithStats.map(supplier => {
                const supplierTransactions = transactions.filter(t => t.supplierId === supplier.id);
                return (
                  <button
                    key={supplier.id}
                    onClick={() => {
                      try {
                        if (supplierTransactions.length === 0) {
                          toast.error("No transactions to export");
                          return;
                        }
                        exportSupplierTransactionsPDF(supplier, supplierTransactions);
                        toast.success(`PDF exported for ${supplier.companyName}`);
                        setPdfExportSheetOpen(false);
                      } catch (error) {
                        console.error("PDF export failed:", error);
                        toast.error("Failed to export PDF");
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 active:scale-[0.99] transition-all text-left"
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full p-0.5 flex-shrink-0",
                        supplier.pendingAmount > 0
                          ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500"
                          : "bg-gradient-to-tr from-green-400 via-emerald-500 to-teal-500"
                      )}
                    >
                      <div className="w-full h-full rounded-full bg-background p-0.5">
                        {supplier.profilePicture ? (
                          <img
                            src={supplier.profilePicture}
                            alt={supplier.companyName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">
                              {supplier.companyName?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{supplier.companyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {supplierTransactions.length} transactions • ₹
                        {supplier.totalAmount.toLocaleString()}
                      </p>
                    </div>

                    {/* Export icon */}
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
