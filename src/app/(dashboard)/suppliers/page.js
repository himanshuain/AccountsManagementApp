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
  List,
  Filter,
  ExternalLink,
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

  // Bill gallery viewer
  const [billGalleryOpen, setBillGalleryOpen] = useState(false);
  const [billGalleryImages, setBillGalleryImages] = useState([]);

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
    }

    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
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
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vyapari</h1>
          <p className="text-sm text-muted-foreground">{suppliers.length} vyapari</p>
        </div>
        {suppliers.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setPdfExportSheetOpen(true)}>
            <FileText className="mr-1 h-4 w-4" />
            PDF
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vyapari..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-9"
        />
      </div>

      {/* Profiles Section - Collapsible */}
      <Collapsible open={profilesExpanded} onOpenChange={setProfilesExpanded}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-lg px-1 py-3 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-emerald-500" />
              <span className="font-semibold">Vyapari Profiles</span>
              <Badge variant="secondary" className="text-xs">
                {filteredSuppliers.length}
              </Badge>
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
          {/* Instagram Story-like Vyapari Grid */}
          {loading ? (
            <div className="grid grid-cols-4 gap-4 py-2 sm:grid-cols-6 lg:grid-cols-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-16 w-16 animate-pulse rounded-full bg-muted sm:h-20 sm:w-20" />
                  <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-1 font-semibold">No vyapari yet</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                {searchQuery
                  ? "No vyapari match your search"
                  : "Add your first vyapari to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={openAddForm} disabled={!isOnline} size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Vyapari
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 py-2 sm:grid-cols-4 sm:gap-5 md:grid-cols-5 lg:grid-cols-6">
              {/* Add New Vyapari Circle */}
              <button
                onClick={openAddForm}
                disabled={!isOnline}
                className="group flex flex-col items-center gap-2"
              >
                <div
                  className="w-18 h-18 flex items-center justify-center rounded-full border-2 border-dashed border-primary/50 bg-primary/5 transition-all group-hover:border-primary group-hover:bg-primary/10 sm:h-20 sm:w-20"
                  style={{ width: "72px", height: "72px" }}
                >
                  <Plus className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
                </div>
                <span className="w-full text-center text-xs font-medium text-muted-foreground">
                  Add New
                </span>
              </button>

              {/* Vyapari Circles */}
              {filteredSuppliers.map(supplier => (
                <button
                  key={supplier.id}
                  onClick={() => handleSupplierClick(supplier)}
                  className="group flex flex-col items-center gap-2"
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
                    <div className="h-full w-full rounded-full bg-background p-0.5">
                      {supplier.profilePicture ? (
                        <img
                          src={supplier.profilePicture}
                          alt={supplier.companyName}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10">
                          <span className="text-xl font-bold text-primary">
                            {supplier.companyName?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="line-clamp-2 w-full max-w-[80px] text-center text-xs font-medium leading-tight">
                    {supplier.companyName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* All Transactions & Bills Section - Collapsible */}
      <Collapsible open={transactionsExpanded} onOpenChange={setTransactionsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-lg px-1 py-3 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-purple-500" />
              <span className="font-semibold">All Transactions & Bills</span>
              <Badge variant="secondary" className="text-xs">
                {transactions.length} txns
              </Badge>
              {totalBillsCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {totalBillsCount} bills
                </Badge>
              )}
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
          <div className="space-y-4 py-2">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={allTxnStatusFilter} onValueChange={setAllTxnStatusFilter}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
              <Select value={allTxnSupplierFilter} onValueChange={setAllTxnSupplierFilter}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vyapari</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.companyName || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={allTxnAmountSort} onValueChange={setAllTxnAmountSort}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="highest">Highest Amount</SelectItem>
                  <SelectItem value="lowest">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>
              {(allTxnStatusFilter !== "all" ||
                allTxnSupplierFilter !== "all" ||
                allTxnAmountSort !== "newest") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAllTxnStatusFilter("all");
                    setAllTxnSupplierFilter("all");
                    setAllTxnAmountSort("newest");
                  }}
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Sub-tabs for List and Bills view */}
            <Tabs value={allTxnSubTab} onValueChange={setAllTxnSubTab}>
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="list" className="gap-1.5">
                  <Receipt className="h-4 w-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="gallery" className="gap-1.5">
                  <ImageIcon className="h-4 w-4" />
                  Bills
                  {totalBillsCount > 0 && (
                    <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-xs text-primary">
                      {totalBillsCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-4">
                {allFilteredTransactions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Receipt className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <p>No transactions found</p>
                    </CardContent>
                  </Card>
                ) : (
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
                  <div className="flex justify-center pb-2 pt-3">
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
                            setImageViewerSrc(selectedSupplier.profilePicture);
                            setImageViewerOpen(true);
                          }
                        }}
                      >
                        <div className="h-full w-full rounded-full bg-background p-0.5">
                          {selectedSupplier.profilePicture ? (
                            <img
                              src={selectedSupplier.profilePicture}
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
                            src={selectedSupplier.upiQrCode}
                            alt="UPI QR"
                            className="mx-auto h-32 w-32 cursor-pointer rounded-lg transition-opacity hover:opacity-90"
                            onClick={() => {
                              setImageViewerSrc(selectedSupplier.upiQrCode);
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
                                          Pay
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
        <SheetContent side="top" className="h-auto max-h-[70vh] rounded-b-2xl p-0" hideClose>
          {/* Drag handle */}
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-4 pb-2">
            <SheetTitle>Record Payment</SheetTitle>
          </SheetHeader>

          {transactionToPay && (
            <div className="space-y-4 px-4 pb-6">
              {/* Summary */}
              <div className="space-y-2 rounded-xl bg-muted/50 p-3">
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
                <div className="flex justify-between border-t pt-2 text-sm">
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
                  <CreditCard className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-green-200 text-green-600 hover:bg-green-50"
                  onClick={handleMarkFullPaid}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Full Paid
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* PDF Export Sheet */}
      <Sheet open={pdfExportSheetOpen} onOpenChange={setPdfExportSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0" hideClose>
          {/* Drag handle */}
          <div className="flex justify-center pb-2 pt-3">
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
                            src={supplier.profilePicture}
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
