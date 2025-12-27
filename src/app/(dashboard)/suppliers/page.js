/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Users,
  User,
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
  ExternalLink,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Autocomplete, TextField as MuiTextField } from "@mui/material";
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
import { BillGallery } from "@/components/BillGallery";
import { TransactionTable } from "@/components/TransactionTable";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { haptics } from "@/hooks/useHaptics";
import { resolveImageUrl } from "@/lib/image-url";

export default function SuppliersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const {
    suppliers,
    loading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    totalCount: suppliersTotalCount,
    fetchNextPage: fetchNextSuppliers,
    hasNextPage: hasMoreSuppliers,
    isFetchingNextPage: isFetchingMoreSuppliers,
  } = useSuppliers();
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    recordPayment,
    markFullPaid,
    deletePayment,
    totalCount: transactionsTotalCount,
    fetchNextPage: fetchNextTransactions,
    hasNextPage: hasMoreTransactions,
    isFetchingNextPage: isFetchingMoreTransactions,
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
  const [activeFilter, setActiveFilter] = useState("all"); // all, pending, partial, paid, high
  const [sortOrder, setSortOrder] = useState("smart"); // smart, highest, lowest, oldest, newest

  // Ref to track if image viewer was just closed (to prevent drawer from closing)
  const imageViewerJustClosedRef = useRef(false);
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
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [isUploadingPaymentReceipt, setIsUploadingPaymentReceipt] = useState(false);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Bill gallery viewer
  const [billGalleryOpen, setBillGalleryOpen] = useState(false);
  const [billGalleryImages, setBillGalleryImages] = useState([]);

  // Supplier profile bill gallery (view all bills for selected supplier)
  const [supplierBillGalleryOpen, setSupplierBillGalleryOpen] = useState(false);

  // Collapsible sections state
  const [profilesExpanded, setProfilesExpanded] = useState(true);
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);

  // All transactions section state
  const [allTxnSubTab, setAllTxnSubTab] = useState("list");
  const [allTxnStatusFilter, setAllTxnStatusFilter] = useState("all");
  const [allTxnSupplierFilter, setAllTxnSupplierFilter] = useState("all");
  const [allTxnAmountSort, setAllTxnAmountSort] = useState("newest");

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
      const lastTransactionDate =
        supplierTransactions.length > 0
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
    const pendingCount = suppliersWithStats.filter(
      s => s.pendingAmount > 0 && s.paidAmount === 0
    ).length;
    const partialCount = suppliersWithStats.filter(
      s => s.pendingAmount > 0 && s.paidAmount > 0
    ).length;
    const paidCount = suppliersWithStats.filter(
      s => s.pendingAmount === 0 && s.totalAmount > 0
    ).length;
    const highAmountCount = suppliersWithStats.filter(s => s.pendingAmount >= 10000).length;
    return {
      totalAmount,
      totalPaid,
      totalPending,
      pendingCount,
      partialCount,
      paidCount,
      highAmountCount,
    };
  }, [suppliersWithStats]);

  // Handle filter chip click with haptic feedback
  const handleFilterChange = filter => {
    haptics.light();
    setActiveFilter(filter);
    setSortOrder("smart");
  };

  // Handle sort order change with haptic feedback
  const handleSortChange = order => {
    haptics.light();
    setSortOrder(order);
  };

  // Helper to format relative date
  const formatRelativeDate = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  // Filter suppliers based on search and filter chips
  const filteredSuppliers = useMemo(() => {
    let filtered = [...suppliersWithStats]; // Create copy to avoid mutating source

    // Search filter - context-aware (name, phone, or amount)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const numericQuery = parseFloat(query.replace(/[^\d.]/g, ""));
      filtered = filtered.filter(
        s =>
          s.name?.toLowerCase().includes(query) ||
          s.companyName?.toLowerCase().includes(query) ||
          s.phone?.includes(query) ||
          // Also search by pending amount
          (!isNaN(numericQuery) &&
            s.pendingAmount >= numericQuery * 0.9 &&
            s.pendingAmount <= numericQuery * 1.1)
      );
    }

    // Apply filter chips
    if (activeFilter === "pending") {
      filtered = filtered.filter(s => s.pendingAmount > 0 && s.paidAmount === 0);
    } else if (activeFilter === "partial") {
      filtered = filtered.filter(s => s.pendingAmount > 0 && s.paidAmount > 0);
    } else if (activeFilter === "paid") {
      filtered = filtered.filter(s => s.pendingAmount === 0 && s.totalAmount > 0);
    } else if (activeFilter === "high") {
      filtered = filtered.filter(s => s.pendingAmount >= 10000);
    }

    // Smart sorting based on active filter
    const effectiveSort =
      sortOrder === "smart"
        ? activeFilter === "pending" || activeFilter === "high"
          ? "highest"
          : activeFilter === "partial"
            ? "oldest"
            : activeFilter === "paid"
              ? "newest"
              : "highest" // default: show highest pending first
        : sortOrder;

    if (effectiveSort === "highest") {
      return filtered.sort((a, b) => b.pendingAmount - a.pendingAmount);
    } else if (effectiveSort === "lowest") {
      return filtered.sort((a, b) => a.pendingAmount - b.pendingAmount);
    } else if (effectiveSort === "oldest") {
      return filtered.sort((a, b) => {
        const dateA =
          a.lastTransactionDate instanceof Date
            ? a.lastTransactionDate
            : new Date(a.lastTransactionDate || 0);
        const dateB =
          b.lastTransactionDate instanceof Date
            ? b.lastTransactionDate
            : new Date(b.lastTransactionDate || 0);
        return dateA - dateB;
      });
    } else if (effectiveSort === "newest") {
      return filtered.sort((a, b) => {
        const dateA =
          a.lastTransactionDate instanceof Date
            ? a.lastTransactionDate
            : new Date(a.lastTransactionDate || 0);
        const dateB =
          b.lastTransactionDate instanceof Date
            ? b.lastTransactionDate
            : new Date(b.lastTransactionDate || 0);
        return dateB - dateA;
      });
    }

    return filtered.sort((a, b) => b.pendingAmount - a.pendingAmount);
  }, [suppliersWithStats, searchQuery, activeFilter, sortOrder]);

  // Handle opening supplier from URL query parameter (e.g., from global search)
  useEffect(() => {
    const openSupplierId = searchParams.get("open");
    if (openSupplierId && suppliersWithStats.length > 0 && !loading) {
      const supplierToOpen = suppliersWithStats.find(s => s.id === openSupplierId);
      if (supplierToOpen) {
        setSelectedSupplier(supplierToOpen);
        // Clear the query parameter from URL without triggering a navigation
        router.replace("/suppliers", { scroll: false });
      }
    }
  }, [searchParams, suppliersWithStats, loading, router]);

  // Handle filter URL parameter (e.g., from dashboard)
  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (filterParam && ["all", "pending", "partial", "paid", "high"].includes(filterParam)) {
      setActiveFilter(filterParam);
      // Clear the query parameter from URL without triggering a navigation
      router.replace("/suppliers", { scroll: false });
    }
  }, [searchParams, router]);

  // Keep selectedSupplier in sync with updated data (fixes totalAmount not updating after transaction)
  useEffect(() => {
    if (selectedSupplier) {
      const updatedSupplier = suppliersWithStats.find(s => s.id === selectedSupplier.id);
      if (
        updatedSupplier &&
        (updatedSupplier.totalAmount !== selectedSupplier.totalAmount ||
          updatedSupplier.paidAmount !== selectedSupplier.paidAmount ||
          updatedSupplier.pendingAmount !== selectedSupplier.pendingAmount ||
          updatedSupplier.transactionCount !== selectedSupplier.transactionCount)
      ) {
        setSelectedSupplier(updatedSupplier);
      }
    }
  }, [suppliersWithStats, selectedSupplier]);

  // Collect all bill images for the selected supplier
  const selectedSupplierBillImages = useMemo(() => {
    if (!selectedSupplier) return [];
    const bills = [];
    transactions
      .filter(t => t.supplierId === selectedSupplier.id)
      .forEach(txn => {
        if (txn.billImages && txn.billImages.length > 0) {
          txn.billImages.forEach(img => {
            if (img) bills.push(img);
          });
        }
      });
    return bills;
  }, [selectedSupplier, transactions]);

  // All filtered transactions for the transactions section
  const allFilteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (allTxnStatusFilter !== "all") {
      filtered = filtered.filter(t => t.paymentStatus === allTxnStatusFilter);
    }
    if (allTxnSupplierFilter !== "all") {
      filtered = filtered.filter(t => t.supplierId === allTxnSupplierFilter);
    }

    // Sort based on selected option
    if (allTxnAmountSort === "highest") {
      return filtered.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    } else if (allTxnAmountSort === "lowest") {
      return filtered.sort((a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0));
    } else if (allTxnAmountSort === "oldest") {
      return [...filtered].sort((a, b) => {
        // Use createdAt (full timestamp) as primary, date as fallback
        const dateA = new Date(a.createdAt || a.date || 0);
        const dateB = new Date(b.createdAt || b.date || 0);
        return dateA.getTime() - dateB.getTime();
      });
    }

    // Default: newest first
    return [...filtered].sort((a, b) => {
      // Use createdAt (full timestamp) as primary, date as fallback
      const dateA = new Date(a.createdAt || a.date || 0);
      const dateB = new Date(b.createdAt || b.date || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [transactions, allTxnStatusFilter, allTxnSupplierFilter, allTxnAmountSort]);

  const totalBillsCount = useMemo(() => {
    return allFilteredTransactions.reduce((count, t) => count + (t.billImages?.length || 0), 0);
  }, [allFilteredTransactions]);

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
      // Update the selected supplier with the new data to keep drawer content fresh
      if (selectedSupplier?.id === editingSupplier.id) {
        setSelectedSupplier(prev => ({ ...prev, ...data }));
      }
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
    // Don't close the drawer - keep selectedSupplier so we can return to it after editing
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
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentSheetOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!transactionToPay || !paymentAmount || isUploadingPaymentReceipt) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const totalAmount = Number(transactionToPay.amount || 0);
    const paidAmount = Number(transactionToPay.paidAmount || 0);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);
    if (amount > pendingAmount) {
      toast.error(`Payment cannot exceed pending amount of ₹${pendingAmount.toLocaleString()}`);
      return;
    }
    const paymentDateTime = paymentDate
      ? new Date(paymentDate).toISOString()
      : new Date().toISOString();
    const result = await recordPayment(
      transactionToPay.id,
      amount,
      paymentReceipt,
      paymentDateTime
    );
    if (result.success) {
      toast.success("Payment recorded");
      setPaymentSheetOpen(false);
      setTransactionToPay(null);
      setPaymentAmount("");
      setPaymentReceipt(null);
      setPaymentDate(new Date().toISOString().split("T")[0]);
    } else {
      toast.error("Failed to record payment");
    }
  };

  const handleMarkFullPaid = async () => {
    if (!transactionToPay || isUploadingPaymentReceipt) return;
    const paymentDateTime = paymentDate
      ? new Date(paymentDate).toISOString()
      : new Date().toISOString();
    const result = await markFullPaid(transactionToPay.id, paymentReceipt, paymentDateTime);
    if (result.success) {
      toast.success("Marked as fully paid");
      setPaymentSheetOpen(false);
      setTransactionToPay(null);
      setPaymentReceipt(null);
      setPaymentDate(new Date().toISOString().split("T")[0]);
    } else {
      toast.error("Failed to mark as paid");
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    const result = await deletePayment(paymentToDelete.transactionId, paymentToDelete.paymentId);
    if (result.success) {
      toast.success(`₹${paymentToDelete.amount.toLocaleString()} payment deleted`);
      setDeletePaymentDialogOpen(false);
      setPaymentToDelete(null);
    } else {
      toast.error("Failed to delete payment");
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
    <div className="space-y-3 p-4 lg:p-6">
      {/* Header - Simplified */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Vyapari</h1>
        <div className="flex gap-2">
          {suppliers.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setPdfExportSheetOpen(true)}>
              <FileText className="mr-1 h-4 w-4" />
              PDF
            </Button>
          )}
          <Button size="sm" onClick={openAddForm} disabled={!isOnline}>
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
                <p>
                  Paid:{" "}
                  <span className="font-medium text-green-600">
                    ₹{summaryStats.totalPaid.toLocaleString()}
                  </span>
                </p>
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
          className="pl-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sticky Filter Chips */}
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            className="h-8 shrink-0 rounded-full px-3 text-xs"
            onClick={() => handleFilterChange("all")}
          >
            All ({suppliersTotalCount})
          </Button>

          {/* Sorting Chips - After All */}
          <div className="mx-1 h-8 w-px shrink-0 bg-border" />
          <Button
            variant={sortOrder === "newest" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs",
              sortOrder !== "newest" &&
                "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
            )}
            onClick={() => handleSortChange("newest")}
          >
            <ArrowDown className="mr-1 h-3 w-3" />
            Newest
          </Button>
          <Button
            variant={sortOrder === "oldest" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs",
              sortOrder !== "oldest" &&
                "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
            )}
            onClick={() => handleSortChange("oldest")}
          >
            <ArrowUp className="mr-1 h-3 w-3" />
            Oldest
          </Button>
          <Button
            variant={sortOrder === "highest" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs",
              sortOrder !== "highest" &&
                "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
            )}
            onClick={() => handleSortChange("highest")}
          >
            <TrendingUp className="mr-1 h-3 w-3" />
            Max ₹
          </Button>
          <Button
            variant={sortOrder === "lowest" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs",
              sortOrder !== "lowest" &&
                "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
            )}
            onClick={() => handleSortChange("lowest")}
          >
            <TrendingDown className="mr-1 h-3 w-3" />
            Min ₹
          </Button>
          <div className="mx-1 h-8 w-px shrink-0 bg-border" />

          <Button
            variant={activeFilter === "pending" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs",
              activeFilter !== "pending" &&
                "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
            )}
            onClick={() => handleFilterChange("pending")}
          >
            <Clock className="mr-1 h-3 w-3" />
            Pending ({summaryStats.pendingCount})
          </Button>
          <Button
            variant={activeFilter === "partial" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs",
              activeFilter !== "partial" &&
                "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
            )}
            onClick={() => handleFilterChange("partial")}
          >
            Partial ({summaryStats.partialCount})
          </Button>
          <Button
            variant={activeFilter === "paid" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs",
              activeFilter !== "paid" &&
                "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
            )}
            onClick={() => handleFilterChange("paid")}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            All Paid Up ({summaryStats.paidCount})
          </Button>
          {summaryStats.highAmountCount > 0 && (
            <Button
              variant={activeFilter === "high" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 shrink-0 rounded-full px-3 text-xs",
                activeFilter !== "high" &&
                  "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              )}
              onClick={() => handleFilterChange("high")}
            >
              High ₹10k+ ({summaryStats.highAmountCount})
            </Button>
          )}
        </div>
      </div>

      {/* Profiles Section - Collapsible */}
      <Collapsible open={profilesExpanded} onOpenChange={setProfilesExpanded}>
        <CollapsibleTrigger asChild>
          <button className="sticky top-14 z-20 -mx-4 flex w-[calc(100%+2rem)] items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur transition-colors hover:bg-muted/50 supports-[backdrop-filter]:bg-background/80 lg:top-[57px]">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold">Vyapari Profiles</span>
              <Badge
                key={`${filteredSuppliers.length}-${activeFilter}-${sortOrder}`}
                variant="secondary"
                className="animate-pop-in text-xs"
              >
                {filteredSuppliers.length}
              </Badge>
              {(activeFilter !== "all" || sortOrder !== "smart") && (
                <Badge variant="outline" className="animate-pop-in text-xs text-muted-foreground">
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
          {/* Vyapari List Cards - Better Information Hierarchy */}
          {loading ? (
            <div className="space-y-3 py-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              {searchQuery ? (
                <>
                  <p className="font-medium">No vyapari matches &quot;{searchQuery}&quot;</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try a different name or amount
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </Button>
                </>
              ) : activeFilter !== "all" ? (
                <>
                  <p className="font-medium">
                    {activeFilter === "pending" && "No pending payments"}
                    {activeFilter === "partial" && "No partially paid suppliers"}
                    {activeFilter === "paid" && "No fully paid suppliers"}
                    {activeFilter === "high" && "No high-value pending (₹10k+)"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeFilter === "paid"
                      ? "Make payments to see them here"
                      : "You're all caught up! 🎉"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setActiveFilter("all")}
                  >
                    Show all vyapari
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium">No vyapari yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add your first vyapari to start tracking
                  </p>
                  <Button size="sm" className="mt-3" onClick={openAddForm} disabled={!isOnline}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add Vyapari
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {filteredSuppliers.map(supplier => {
                // Get last transaction for this supplier
                const supplierTxns = transactions
                  .filter(t => t.supplierId === supplier.id)
                  .sort((a, b) => new Date(b.date) - new Date(a.date));
                const lastTxn = supplierTxns[0];
                const lastTxnAmount = lastTxn ? Number(lastTxn.amount) || 0 : 0;

                // Determine payment status
                const isPaid = supplier.pendingAmount === 0 && supplier.totalAmount > 0;
                const isPartial = supplier.pendingAmount > 0 && supplier.paidAmount > 0;
                const isPending = supplier.pendingAmount > 0 && supplier.paidAmount === 0;

                return (
                  <Card
                    key={supplier.id}
                    className={cn(
                      "cursor-pointer overflow-hidden transition-all hover:bg-muted/30 active:scale-[0.99]",
                      isPending
                        ? "border-l-4 border-l-amber-500"
                        : isPartial
                          ? "border-l-4 border-l-blue-500"
                          : isPaid
                            ? "border-l-4 border-l-green-500"
                            : "border-l-4 border-l-muted"
                    )}
                    onClick={() => {
                      haptics.light();
                      handleSupplierClick(supplier);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {/* Avatar - smaller */}
                        <div
                          className={cn(
                            "h-10 w-10 shrink-0 rounded-full p-0.5",
                            isPending
                              ? "bg-amber-500"
                              : isPartial
                                ? "bg-blue-500"
                                : isPaid
                                  ? "bg-green-500"
                                  : "bg-muted"
                          )}
                        >
                          <div className="h-full w-full rounded-full bg-background">
                            {supplier.profilePicture ? (
                              <img
                                src={resolveImageUrl(supplier.profilePicture)}
                                alt={supplier.companyName}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                                {supplier.companyName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Info - Hierarchy: Name → Pending → Status → Last Txn */}
                        <div className="min-w-0 flex-1">
                          {/* Row 1: Name + Status Badge */}
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold">{supplier.companyName}</p>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "shrink-0 px-1.5 py-0 text-[10px]",
                                isPending &&
                                  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                isPartial &&
                                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                isPaid &&
                                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              )}
                            >
                              {isPending
                                ? "Total Pending"
                                : isPartial
                                  ? "Partially Paid"
                                  : isPaid
                                    ? "Fully Paid"
                                    : "No Dues"}
                            </Badge>
                          </div>

                          {/* Row 2: Pending Amount (HERO) */}
                          {supplier.pendingAmount > 0 && (
                            <p className="mt-0.5 text-lg font-bold text-amber-600 dark:text-amber-400">
                              ₹{supplier.pendingAmount.toLocaleString()}
                            </p>
                          )}

                          {/* Row 3: Last transaction info */}
                          {lastTxn && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Latest Vypari bill of: ₹{lastTxnAmount.toLocaleString()} ·{" "}
                              {formatRelativeDate(lastTxn.date)}
                              {supplier.transactionCount > 1 &&
                                ` · ${supplier.transactionCount} txns`}
                            </p>
                          )}
                        </div>

                        {/* Chevron */}
                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Infinite scroll trigger for loading more suppliers */}
              <InfiniteScrollTrigger
                onLoadMore={fetchNextSuppliers}
                hasMore={hasMoreSuppliers}
                isLoading={isFetchingMoreSuppliers}
                loadedCount={suppliers.length}
                totalCount={suppliersTotalCount}
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* All Transactions & Bills Section - Collapsible */}
      <Collapsible open={transactionsExpanded} onOpenChange={setTransactionsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="sticky top-[57px] z-20 -mx-4 flex w-[calc(100%+2rem)] items-center justify-between rounded-lg border border-purple-200 bg-background/95 px-5 py-3 backdrop-blur transition-colors hover:bg-muted/50 supports-[backdrop-filter]:bg-background/80 lg:top-[105px]">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-purple-500" />
              <span className="font-semibold">All Transactions</span>
              <Badge variant="secondary" className="text-xs">
                {transactionsTotalCount}
              </Badge>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                transactionsExpanded && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 py-3">
            {/* Filter Chips - One-tap toggles - Sticky when expanded */}
            <div className="scrollbar-none sticky top-[102px] z-10 -mx-4 flex gap-2 overflow-x-auto border-b bg-background/95 px-5 pb-2 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:top-[153px]">
              <Button
                variant={allTxnStatusFilter === "all" ? "default" : "outline"}
                size="sm"
                className="h-8 shrink-0 rounded-full px-3 text-xs"
                onClick={() => {
                  haptics.light();
                  setAllTxnStatusFilter("all");
                  setAllTxnAmountSort("newest");
                }}
              >
                All ({transactions.length})
              </Button>

              {/* Sorting Chips */}
              <div className="mx-1 h-8 w-px shrink-0 bg-border" />
              <Button
                variant={allTxnAmountSort === "newest" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  allTxnAmountSort !== "newest" &&
                    "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
                )}
                onClick={() => {
                  haptics.light();
                  setAllTxnAmountSort("newest");
                }}
              >
                <ArrowDown className="mr-1 h-3 w-3" />
                Newest
              </Button>
              <Button
                variant={allTxnAmountSort === "oldest" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  allTxnAmountSort !== "oldest" &&
                    "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
                )}
                onClick={() => {
                  haptics.light();
                  setAllTxnAmountSort("oldest");
                }}
              >
                <ArrowUp className="mr-1 h-3 w-3" />
                Oldest
              </Button>
              <Button
                variant={allTxnAmountSort === "highest" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  allTxnAmountSort !== "highest" &&
                    "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                )}
                onClick={() => {
                  haptics.light();
                  setAllTxnAmountSort("highest");
                }}
              >
                <TrendingUp className="mr-1 h-3 w-3" />
                Max ₹
              </Button>
              <Button
                variant={allTxnAmountSort === "lowest" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  allTxnAmountSort !== "lowest" &&
                    "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                )}
                onClick={() => {
                  haptics.light();
                  setAllTxnAmountSort("lowest");
                }}
              >
                <TrendingDown className="mr-1 h-3 w-3" />
                Min ₹
              </Button>
              <div className="mx-1 h-8 w-px shrink-0 bg-border" />

              <Button
                variant={allTxnStatusFilter === "pending" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  allTxnStatusFilter !== "pending" &&
                    "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
                )}
                onClick={() => {
                  haptics.light();
                  setAllTxnStatusFilter("pending");
                }}
              >
                <Clock className="mr-1 h-3 w-3" />
                Pending
              </Button>
              <Button
                variant={allTxnStatusFilter === "partial" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  allTxnStatusFilter !== "partial" &&
                    "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                )}
                onClick={() => {
                  haptics.light();
                  setAllTxnStatusFilter("partial");
                }}
              >
                Partial
              </Button>
              <Button
                variant={allTxnStatusFilter === "paid" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  allTxnStatusFilter !== "paid" &&
                    "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                )}
                onClick={() => {
                  haptics.light();
                  setAllTxnStatusFilter("paid");
                }}
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                All Paid Up
              </Button>
              {/* Vyapari filter as autocomplete */}
              <Autocomplete
                options={[{ id: "all", companyName: "All Vyapari" }, ...suppliers]}
                value={
                  [{ id: "all", companyName: "All Vyapari" }, ...suppliers].find(
                    s => s.id === allTxnSupplierFilter
                  ) || null
                }
                onChange={(_, newValue) => {
                  haptics.light();
                  setAllTxnSupplierFilter(newValue?.id || "all");
                }}
                getOptionLabel={opt => opt?.companyName || opt?.name || ""}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                renderInput={params => (
                  <MuiTextField
                    {...params}
                    placeholder="All Vyapari"
                    size="small"
                    sx={{
                      minWidth: 160,
                      "& .MuiOutlinedInput-root": {
                        backgroundColor: "hsl(var(--background))",
                        color: "hsl(var(--foreground))",
                        "& fieldset": {
                          borderColor: "hsl(var(--border))",
                        },
                        "&:hover fieldset": {
                          borderColor: "hsl(var(--primary))",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "hsl(var(--primary))",
                        },
                      },
                      "& .MuiInputBase-input": {
                        color: "hsl(var(--foreground))",
                      },
                      "& .MuiAutocomplete-endAdornment": {
                        "& .MuiSvgIcon-root": {
                          color: "hsl(var(--foreground))",
                        },
                      },
                    }}
                  />
                )}
                noOptionsText="No vyapari found"
                size="small"
                sx={{ width: 160, flexShrink: 0 }}
                slotProps={{
                  paper: {
                    elevation: 8,
                    sx: {
                      mt: 0.5,
                      bgcolor: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                      border: "1px solid hsl(var(--border))",
                      "& .MuiAutocomplete-listbox": {
                        padding: "4px",
                        "& .MuiAutocomplete-option": {
                          borderRadius: "6px",
                          color: "hsl(var(--foreground))",
                          "&:hover": {
                            bgcolor: "hsl(var(--accent))",
                          },
                          '&[aria-selected="true"]': {
                            bgcolor: "hsl(var(--primary) / 0.1)",
                          },
                          "&.Mui-focused": {
                            bgcolor: "hsl(var(--accent))",
                          },
                        },
                      },
                      "& .MuiAutocomplete-noOptions": {
                        color: "hsl(var(--muted-foreground))",
                      },
                    },
                  },
                  popper: {
                    sx: { zIndex: 99999 },
                  },
                }}
              />
            </div>

            {/* Stats + View toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  key={`${allFilteredTransactions.length}-${allTxnStatusFilter}-${allTxnAmountSort}`}
                  variant="secondary"
                  className="animate-pop-in text-xs"
                >
                  {allFilteredTransactions.length} transaction
                  {allFilteredTransactions.length !== 1 ? "s" : ""}
                </Badge>
                {(allTxnStatusFilter !== "all" || allTxnAmountSort !== "newest") && (
                  <Badge variant="outline" className="animate-pop-in text-xs text-muted-foreground">
                    {allTxnStatusFilter !== "all" && allTxnStatusFilter}
                    {allTxnStatusFilter !== "all" && allTxnAmountSort !== "newest" && " · "}
                    {allTxnAmountSort !== "newest" && allTxnAmountSort}
                  </Badge>
                )}
              </div>
            </div>

            {/* Sub-tabs for List and Bills view */}
            <Tabs value={allTxnSubTab} onValueChange={setAllTxnSubTab}>
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="list" className="gap-1.5">
                  <Receipt className="h-4 w-4" />
                  Transactions List
                </TabsTrigger>
                <TabsTrigger value="gallery" className="gap-1.5">
                  <Badge className="text-xs">
                    <ImageIcon className="mr-1 h-4 w-4" />
                    {totalBillsCount} Bills
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-3">
                {allFilteredTransactions.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Receipt className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium">
                      {allTxnStatusFilter === "pending" && "No pending transactions"}
                      {allTxnStatusFilter === "partial" && "No partially paid transactions"}
                      {allTxnStatusFilter === "paid" && "No paid transactions"}
                      {allTxnStatusFilter === "all" && "No transactions yet"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {allTxnStatusFilter !== "all"
                        ? "Try a different filter"
                        : "Add transactions to see them here"}
                    </p>
                    {allTxnStatusFilter !== "all" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setAllTxnStatusFilter("all")}
                      >
                        Show all
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <TransactionTable
                      transactions={allFilteredTransactions}
                      suppliers={suppliers}
                      onEdit={txn => {
                        if (!isOnline) {
                          toast.error("Cannot edit while offline");
                          return;
                        }
                        setTransactionToEdit(txn);
                        setTransactionFormOpen(true);
                      }}
                      onDelete={txn => {
                        if (!isOnline) {
                          toast.error("Cannot delete while offline");
                          return;
                        }
                        setTransactionToDelete(txn);
                        setTxnDeleteDialogOpen(true);
                      }}
                      loading={false}
                    />
                    {/* Infinite scroll trigger for loading more transactions */}
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

              <TabsContent value="gallery" className="mt-4">
                <BillGallery transactions={allFilteredTransactions} suppliers={suppliers} />
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Supplier Detail Drawer */}
      <Sheet
        open={!!selectedSupplier}
        onOpenChange={open => {
          // Don't close if image viewer, bill gallery, or supplier form is open
          // Also don't close if image viewer was just closed (ref check)
          if (
            !open &&
            (imageViewerOpen ||
              billGalleryOpen ||
              supplierBillGalleryOpen ||
              supplierFormOpen ||
              imageViewerJustClosedRef.current)
          ) {
            imageViewerJustClosedRef.current = false;
            return;
          }
          if (!open) setSelectedSupplier(null);
        }}
      >
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0" hideClose>
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
                  <div className="flex justify-center pb-2 pt-3" data-drag-handle>
                    <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                  </div>

                  {/* Header with profile and actions */}
                  <SheetHeader className="border-b px-4 pb-3">
                    <div className="flex items-center gap-3">
                      {/* Profile Picture */}
                      <div
                        className={cn(
                          "h-14 w-14 flex-shrink-0 cursor-pointer rounded-full p-0.5",
                          selectedSupplier.pendingAmount > 0
                            ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500"
                            : "bg-gradient-to-tr from-green-400 via-emerald-500 to-teal-500"
                        )}
                        onClick={() => {
                          if (selectedSupplier.profilePicture) {
                            setImageViewerSrc(resolveImageUrl(selectedSupplier.profilePicture));
                            setImageViewerOpen(true);
                          }
                        }}
                      >
                        <div className="h-full w-full rounded-full bg-background p-0.5">
                          {selectedSupplier.profilePicture ? (
                            <img
                              src={resolveImageUrl(selectedSupplier.profilePicture)}
                              alt={selectedSupplier.name}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10">
                              <span className="text-xl font-bold text-primary">
                                {selectedSupplier.name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Name and info */}
                      <div className="min-w-0 flex-1">
                        <SheetTitle className="truncate pb-2 text-xl font-bold">
                          {selectedSupplier.companyName}
                        </SheetTitle>
                        {selectedSupplier.phone && (
                          <a
                            href={`tel:${selectedSupplier.phone}`}
                            className="inline-flex w-fit items-center gap-1 text-sm text-primary"
                          >
                            <Phone className="h-3 w-3" />
                            {selectedSupplier.phone}
                          </a>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-40 text-xs"
                          onClick={() => handleEditSupplier(selectedSupplier)}
                          disabled={!isOnline}
                        >
                          <Edit className="h-4 w-4" />
                          Edit Vyapari Profile
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
                              <FileText className="mr-2 h-4 w-4" />
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
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Vyapari
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(90vh-100px)] flex-1">
                    <div className="space-y-4 p-4">
                      {/* UPI QR Code if available */}
                      {selectedSupplier.upiQrCode && (
                        <div className="rounded-xl bg-muted/30 p-4 text-center">
                          <p className="mb-2 text-xs text-muted-foreground">UPI QR Code</p>
                          <img
                            src={resolveImageUrl(selectedSupplier.upiQrCode)}
                            alt="UPI QR"
                            className="mx-auto h-32 w-32 cursor-pointer rounded-lg transition-opacity hover:opacity-90"
                            onClick={() => {
                              setImageViewerSrc(resolveImageUrl(selectedSupplier.upiQrCode));
                              setImageViewerOpen(true);
                            }}
                          />
                          {selectedSupplier.upiId && (
                            <a
                              href={`upi://pay?pa=${encodeURIComponent(selectedSupplier.upiId)}&pn=${encodeURIComponent(selectedSupplier.companyName || selectedSupplier.name || "")}`}
                              className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              {selectedSupplier.upiId}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-muted/50 p-3 text-center">
                          <p className="text-[10px] text-muted-foreground">Total</p>
                          <p className="text-lg font-bold">
                            ₹{(selectedSupplier.totalAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl bg-green-500/10 p-3 text-center">
                          <p className="text-[10px] text-green-600">Paid</p>
                          <p className="text-lg font-bold text-green-600">
                            ₹{(selectedSupplier.paidAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-xl bg-amber-500/10 p-3 text-center">
                          <p className="text-[10px] text-amber-600">Pending</p>
                          <p className="text-lg font-bold text-amber-600">
                            ₹{(selectedSupplier.pendingAmount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Profile Details */}
                      {(selectedSupplier.name ||
                        selectedSupplier.address ||
                        selectedSupplier.gstNumber ||
                        (selectedSupplier.upiId && !selectedSupplier.upiQrCode)) && (
                        <div className="space-y-3 rounded-xl border bg-card p-4">
                          <h3 className="flex items-center gap-2 text-sm font-semibold">
                            <User className="h-4 w-4 text-muted-foreground" />
                            Profile Details
                          </h3>
                          <div className="grid gap-3 text-sm">
                            {selectedSupplier.name && (
                              <div className="flex items-start gap-3">
                                <span className="min-w-[80px] text-muted-foreground">Contact:</span>
                                <span className="font-medium">{selectedSupplier.name}</span>
                              </div>
                            )}
                            {selectedSupplier.address && (
                              <div className="flex items-start gap-3">
                                <span className="min-w-[80px] text-muted-foreground">Address:</span>
                                <span className="font-medium">{selectedSupplier.address}</span>
                              </div>
                            )}
                            {selectedSupplier.gstNumber && (
                              <div className="flex items-start gap-3">
                                <span className="min-w-[80px] text-muted-foreground">GST No:</span>
                                <span className="font-mono font-medium">
                                  {selectedSupplier.gstNumber}
                                </span>
                              </div>
                            )}
                            {/* Only show UPI ID here if there's no QR code */}
                            {selectedSupplier.upiId && !selectedSupplier.upiQrCode && (
                              <div className="flex items-start gap-3">
                                <span className="min-w-[80px] text-muted-foreground">UPI ID:</span>
                                <a
                                  href={`upi://pay?pa=${encodeURIComponent(selectedSupplier.upiId)}&pn=${encodeURIComponent(selectedSupplier.companyName || selectedSupplier.name || "")}`}
                                  className="inline-flex items-center gap-1 font-mono font-medium text-primary hover:underline"
                                >
                                  {selectedSupplier.upiId}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bills Section - View all bills from transactions */}
                      {selectedSupplierBillImages.length > 0 && (
                        <div className="mb-4">
                          <div className="mb-2 flex items-center justify-between ">                           
                            <Button
                              className="bg-sky-800/10 text-sky-800  hover:bg-sky-800/20 "
                              variant="secondary"
                              size="sm"
                              onClick={() => setSupplierBillGalleryOpen(true)}
                            >
                              <ImageIcon className="mr-1 h-4 w-4" />
                              View All Bill Photos ({selectedSupplierBillImages.length})
                            </Button>
                          </div>
                          
                        </div>
                      )}

                      {/* Transactions Section */}
                      <div>
                        <div className="mb-3 flex items-center justify-between">
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
                            <Plus className="mr-1 h-4 w-4" />
                            Add
                          </Button>
                        </div>

                        {supplierTransactions.length === 0 ? (
                          <div className="py-8 text-center text-muted-foreground">
                            <IndianRupee className="mx-auto mb-2 h-10 w-10 opacity-50" />
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
                                    "overflow-hidden transition-all",
                                    isPaid
                                      ? "border-l-4 border-l-green-500"
                                      : isPartial
                                        ? "border-l-4 border-l-blue-500"
                                        : "border-l-4 border-l-amber-500",
                                    isExpanded && "shadow-md ring-2 ring-primary/20"
                                  )}
                                >
                                  <CardContent className="p-0">
                                    <div
                                      className={cn(
                                        "p-3 transition-colors",
                                        isExpanded
                                          ? "bg-primary/5"
                                          : hasPayments && "cursor-pointer hover:bg-muted/30"
                                      )}
                                      onClick={() =>
                                        hasPayments &&
                                        setExpandedTransactionId(isExpanded ? null : txn.id)
                                      }
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="mb-0.5 flex items-center gap-2">
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
                                              {isPaid
                                                ? "Fully Paid"
                                                : isPartial
                                                  ? "Partially Paid"
                                                  : "Total Pending"}
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
                                          <div className="mb-1 flex items-center justify-between text-xs">
                                            <span className="text-green-600">
                                              Paid: ₹{paid.toLocaleString()}
                                            </span>
                                            <span className="text-amber-600">
                                              Pending: ₹{pending.toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                            <div
                                              className="h-full rounded-full bg-green-500"
                                              style={{ width: `${(paid / amount) * 100}%` }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Buttons - Always visible */}
                                    <div className="flex flex-wrap items-center gap-2 border-t bg-muted/10 px-3 py-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={e => handleEditTransaction(txn, e)}
                                        disabled={!isOnline}
                                      >
                                        <Edit className="mr-1 h-3 w-3" />
                                        Edit
                                      </Button>
                                      {!isPaid && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 border-green-200 text-xs text-green-600 hover:bg-green-50"
                                          onClick={e => handlePayTransaction(txn, e)}
                                          disabled={!isOnline}
                                        >
                                          <CreditCard className="mr-1 h-3 w-3" />
                                          Record Payment
                                        </Button>
                                      )}
                                      {txn.billImages && txn.billImages.length > 0 && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 border-blue-200 text-xs text-blue-600 hover:bg-blue-50"
                                          onClick={e => handleViewBillImages(txn.billImages, e)}
                                        >
                                          <ImageIcon className="mr-1 h-3 w-3" />
                                          Photos ({txn.billImages.length})
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-destructive/20 text-xs text-destructive hover:bg-destructive/10"
                                        onClick={e => handleDeleteTransaction(txn, e)}
                                        disabled={!isOnline}
                                      >
                                        <Trash2 className="mr-1 h-3 w-3" />
                                        Delete
                                      </Button>
                                    </div>

                                    {/* Expanded Section - Payment History */}
                                    {isExpanded && hasPayments && (
                                      <div className="border-t bg-primary/5 px-3 pb-3">
                                        <div className="pt-3">
                                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                                            Payment History
                                          </p>
                                          <div className="space-y-0">
                                            {txn.payments
                                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                                              .map((payment, index, arr) => (
                                                <div key={payment.id} className="flex">
                                                  <div className="mr-3 flex flex-col items-center">
                                                    <div
                                                      className={cn(
                                                        "flex h-3 w-3 items-center justify-center rounded-full",
                                                        index === 0
                                                          ? "bg-green-500"
                                                          : "bg-green-400"
                                                      )}
                                                    >
                                                      <CheckCircle2 className="h-2 w-2 text-white" />
                                                    </div>
                                                    {index < arr.length - 1 && (
                                                      <div className="h-full min-h-[20px] w-0.5 bg-green-300" />
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
                                                          onClick={e => {
                                                            e.stopPropagation();
                                                            setImageViewerSrc(payment.receiptUrl);
                                                            setImageViewerOpen(true);
                                                          }}
                                                        >
                                                          <Receipt className="mr-1 h-3 w-3" />
                                                          Receipt
                                                        </Button>
                                                      )}
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                        onClick={e => {
                                                          e.stopPropagation();
                                                          setPaymentToDelete({
                                                            transactionId: txn.id,
                                                            paymentId: payment.id,
                                                            amount: payment.amount,
                                                          });
                                                          setDeletePaymentDialogOpen(true);
                                                        }}
                                                        disabled={!isOnline}
                                                      >
                                                        <Trash2 className="h-3 w-3" />
                                                      </Button>
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
                        <div className="rounded-xl bg-muted/30 p-3">
                          <p className="mb-1 text-xs text-muted-foreground">Notes</p>
                          <p className="text-sm">{selectedSupplier.notes}</p>
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
      <ImageViewer
        open={imageViewerOpen}
        onOpenChange={open => {
          if (!open) {
            imageViewerJustClosedRef.current = true;
            // Reset the ref after a short delay
            setTimeout(() => {
              imageViewerJustClosedRef.current = false;
            }, 100);
          }
          setImageViewerOpen(open);
        }}
        src={imageViewerSrc}
      />

      {/* Bill Gallery Viewer */}
      <ImageGalleryViewer
        open={billGalleryOpen}
        onOpenChange={open => {
          if (!open) {
            imageViewerJustClosedRef.current = true;
            setTimeout(() => {
              imageViewerJustClosedRef.current = false;
            }, 100);
          }
          setBillGalleryOpen(open);
        }}
        images={billGalleryImages}
      />

      {/* Supplier Profile Bill Gallery Viewer */}
      <ImageGalleryViewer
        open={supplierBillGalleryOpen}
        onOpenChange={open => {
          if (!open) {
            imageViewerJustClosedRef.current = true;
            setTimeout(() => {
              imageViewerJustClosedRef.current = false;
            }, 100);
          }
          setSupplierBillGalleryOpen(open);
        }}
        images={selectedSupplierBillImages}
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

      {/* Payment Delete Confirmation */}
      <DeleteConfirmDialog
        open={deletePaymentDialogOpen}
        onOpenChange={setDeletePaymentDialogOpen}
        onConfirm={handleDeletePayment}
        title="Delete Payment"
        description="Are you sure you want to delete this payment record? The transaction pending amount will be updated accordingly."
        itemName={paymentToDelete ? `₹${paymentToDelete.amount?.toLocaleString()}` : ""}
      />

      {/* Payment Sheet */}
      <Sheet open={paymentSheetOpen} onOpenChange={setPaymentSheetOpen}>
        <SheetContent side="top" className="h-auto max-h-[70vh] rounded-b-2xl p-0" hideClose>
          {/* Drag handle */}
          <div className="flex justify-center pb-2 pt-3" data-drag-handle>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-4 pb-2">
            <SheetTitle>Record Payment</SheetTitle>
          </SheetHeader>

          {transactionToPay &&
            (() => {
              const totalAmount = Number(transactionToPay.amount || 0);
              const paidAmount = Number(transactionToPay.paidAmount || 0);
              const pendingAmount = Math.max(0, totalAmount - paidAmount);
              const numericPayment = Number(paymentAmount);
              const paymentExceedsPending =
                !isNaN(numericPayment) && numericPayment > pendingAmount;

              return (
                <div className="space-y-4 px-4 pb-6">
                  {/* Summary */}
                  <div className="space-y-2 rounded-xl bg-muted/50 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="font-semibold">₹{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Already Paid</span>
                      <span className="font-semibold text-green-600">
                        ₹{paidAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2 text-sm">
                      <span className="text-muted-foreground">Pending</span>
                      <span className="font-semibold text-amber-600">
                        ₹{pendingAmount.toLocaleString()}
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
                      max={pendingAmount}
                    />
                    {paymentAmount && paymentExceedsPending && (
                      <p className="text-xs text-destructive">
                        Cannot exceed pending amount of ₹{pendingAmount.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Payment Date */}
                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="text-base"
                    />
                  </div>

                  {/* Receipt Upload */}
                  <div className="space-y-2">
                    <Label>Payment Receipt (Optional)</Label>
                    <div className="w-44">
                      <ImageUpload
                        value={paymentReceipt}
                        onChange={setPaymentReceipt}
                        placeholder="Receipt"
                        aspectRatio="square"
                        onUploadingChange={setIsUploadingPaymentReceipt}
                        folder="receipts"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleRecordPayment}
                      disabled={
                        !paymentAmount ||
                        parseFloat(paymentAmount) <= 0 ||
                        paymentExceedsPending ||
                        isUploadingPaymentReceipt
                      }
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Record Payment
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-green-200 text-green-600 hover:bg-green-50"
                      onClick={handleMarkFullPaid}
                      disabled={isUploadingPaymentReceipt}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Full Paid
                    </Button>
                  </div>
                </div>
              );
            })()}
        </SheetContent>
      </Sheet>

      {/* PDF Export Sheet */}
      <Sheet open={pdfExportSheetOpen} onOpenChange={setPdfExportSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0" hideClose>
          {/* Drag handle */}
          <div className="flex justify-center pb-2 pt-3" data-drag-handle>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="border-b px-4 pb-3">
            <SheetTitle className="text-lg">Export PDF Report</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Select a vyapari to export their transaction report
            </p>
          </SheetHeader>

          <ScrollArea className="h-[calc(70vh-100px)] flex-1">
            <div className="space-y-2 p-4">
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
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:bg-muted/50 active:scale-[0.99]"
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "h-12 w-12 flex-shrink-0 rounded-full p-0.5",
                        supplier.pendingAmount > 0
                          ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500"
                          : "bg-gradient-to-tr from-green-400 via-emerald-500 to-teal-500"
                      )}
                    >
                      <div className="h-full w-full rounded-full bg-background p-0.5">
                        {supplier.profilePicture ? (
                          <img
                            src={resolveImageUrl(supplier.profilePicture)}
                            alt={supplier.companyName}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10">
                            <span className="text-lg font-bold text-primary">
                              {supplier.companyName?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{supplier.companyName}</p>
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
