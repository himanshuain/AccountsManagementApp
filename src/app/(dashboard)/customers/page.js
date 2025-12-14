/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Users,
  Search,
  IndianRupee,
  Phone,
  Calendar,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  ArrowLeft,
  MapPin,
  Banknote,
  CheckCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
  Check,
  Camera,
  ImagePlus,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { compressImage } from "@/lib/image-compression";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { CustomerForm } from "@/components/CustomerForm";
import { UdharForm } from "@/components/UdharForm";
import { toast } from "sonner";
import { cn, getAmountTextSize } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageViewer } from "@/components/ImageViewer";
import { useProgressiveList, LoadMoreTrigger } from "@/hooks/useProgressiveList";

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    loading: customersLoading,
  } = useCustomers();
  const {
    udharList,
    addUdhar,
    deleteUdhar,
    recordDeposit,
    markFullPaid,
    deletePayment,
    loading: udharLoading,
  } = useUdhar();

  const [searchQuery, setSearchQuery] = useState("");
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddAmount, setQuickAddAmount] = useState("");
  const [quickAddCustomer, setQuickAddCustomer] = useState(null);

  // New customer with initial amount
  const [newCustomerWithAmount, setNewCustomerWithAmount] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");

  // Customer detail view
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentUdhar, setPaymentUdhar] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReceipts, setPaymentReceipts] = useState([]);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const paymentInputRef = useRef(null);
  const receiptInputRef = useRef(null);
  const receiptGalleryInputRef = useRef(null);

  // Quick collect dialog state (for collecting from customer card)
  const [quickCollectOpen, setQuickCollectOpen] = useState(false);
  const [quickCollectCustomer, setQuickCollectCustomer] = useState(null);
  const [quickCollectAmount, setQuickCollectAmount] = useState("");
  const [quickCollectReceipts, setQuickCollectReceipts] = useState([]);
  const [quickCollectNotes, setQuickCollectNotes] = useState("");
  const [isUploadingQuickReceipt, setIsUploadingQuickReceipt] = useState(false);
  const quickCollectInputRef = useRef(null);
  const quickReceiptInputRef = useRef(null);
  const quickReceiptGalleryInputRef = useRef(null);

  // Quick add udhar state
  const quickAddInputRef = useRef(null);
  const [quickAddBillImages, setQuickAddBillImages] = useState([]);
  const [quickAddNotes, setQuickAddNotes] = useState("");
  const [isUploadingQuickAddBill, setIsUploadingQuickAddBill] = useState(false);
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);
  const quickAddBillInputRef = useRef(null);
  const quickAddBillGalleryInputRef = useRef(null);

  // Loading states for other quick actions
  const [isSubmittingQuickCollect, setIsSubmittingQuickCollect] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Expanded customer actions state
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  // Expanded udhar transactions (to show payment timeline)
  const [expandedUdharId, setExpandedUdharId] = useState(null);

  // Udhar transactions drawer state
  const [udharDrawerOpen, setUdharDrawerOpen] = useState(false);
  const [udharDrawerCustomer, setUdharDrawerCustomer] = useState(null);

  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState("");

  // Payment deletion state
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Auto-focus payment input and scroll into view
  useEffect(() => {
    if (paymentDialogOpen && paymentInputRef.current) {
      setTimeout(() => {
        paymentInputRef.current?.focus();
        paymentInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 500);
    }
  }, [paymentDialogOpen]);

  // Auto-focus quick collect input and scroll into view
  useEffect(() => {
    if (quickCollectOpen && quickCollectInputRef.current) {
      setTimeout(() => {
        quickCollectInputRef.current?.focus();
        quickCollectInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 500);
    }
  }, [quickCollectOpen]);

  // Auto-focus quick add input
  useEffect(() => {
    if (quickAddOpen && quickAddInputRef.current) {
      setTimeout(() => {
        quickAddInputRef.current?.focus();
        quickAddInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 500);
    }
  }, [quickAddOpen]);

  // Calculate totals for each customer
  const customersWithStats = useMemo(() => {
    return customers.map((customer) => {
      const customerUdhar = udharList.filter(
        (u) => u.customerId === customer.id,
      );

      const totalAmount = customerUdhar.reduce((sum, u) => {
        return sum + (u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0));
      }, 0);

      const paidAmount = customerUdhar.reduce((sum, u) => {
        return sum + (u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0));
      }, 0);

      const pendingAmount = Math.max(0, totalAmount - paidAmount);
      const transactionCount = customerUdhar.length;

      return {
        ...customer,
        totalAmount,
        paidAmount,
        pendingAmount,
        transactionCount,
      };
    });
  }, [customers, udharList]);

  // Handle opening customer from URL query parameter (e.g., from search)
  useEffect(() => {
    const openCustomerId = searchParams.get("open");
    if (openCustomerId && customersWithStats.length > 0 && !customersLoading) {
      const customerToOpen = customersWithStats.find(
        (c) => c.id === openCustomerId,
      );
      if (customerToOpen) {
        setSelectedCustomer(customerToOpen);
        // Clear the query parameter from URL without triggering a navigation
        router.replace("/customers", { scroll: false });
      }
    }
  }, [searchParams, customersWithStats, customersLoading, router]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = customersWithStats;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.address?.toLowerCase().includes(query),
      );
    }

    // Sort by most recently updated
    return filtered.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    );
  }, [customersWithStats, searchQuery]);

  // Progressive loading for large customer lists
  const {
    visibleItems: visibleCustomers,
    hasMore: hasMoreCustomers,
    loadMore: loadMoreCustomers,
    loadMoreRef: customersLoadMoreRef,
    remainingCount: customersRemaining,
  } = useProgressiveList(filteredCustomers, 15, 15);

  // Quick add udhar for a customer
  const handleQuickAdd = async () => {
    if (!quickAddAmount || Number(quickAddAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmittingQuickAdd(true);
    const customerId = quickAddCustomer.id;
    try {
      const result = await addUdhar({
        customerId: customerId,
        amount: Number(quickAddAmount),
        date: new Date().toISOString().split("T")[0],
        notes: quickAddNotes,
        billImages: quickAddBillImages,
      });

      if (result.success) {
        toast.success(`₹${Number(quickAddAmount).toLocaleString()} Udhar added`);
        setQuickAddOpen(false);
        setQuickAddAmount("");
        setQuickAddBillImages([]);
        setQuickAddNotes("");
        setQuickAddCustomer(null);
        // Keep the collapsible open for the customer
        setExpandedCustomerId(customerId);
      } else {
        toast.error("Failed to add Udhar");
      }
    } finally {
      setIsSubmittingQuickAdd(false);
    }
  };

  // Handle quick add bill image upload
  const handleQuickAddBillSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingQuickAddBill(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const compressedFile = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressedFile);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const { url } = await response.json();
          uploadedUrls.push(url);
        }
      }
      setQuickAddBillImages((prev) => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error("Error uploading bill images:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploadingQuickAddBill(false);
      e.target.value = "";
    }
  };

  // Handle new customer with initial amount
  const handleAddCustomerWithAmount = async (customerData) => {
    const result = await addCustomer(customerData);

    if (result.success && initialAmount && Number(initialAmount) > 0) {
      // Add initial udhar transaction
      await addUdhar({
        customerId: result.data.id,
        amount: Number(initialAmount),
        date: new Date().toISOString().split("T")[0],
        notes: "Initial lending amount",
      });
      toast.success("Customer added with initial Udhar");
    } else if (result.success) {
      toast.success("Customer added");
    }

    setNewCustomerWithAmount(false);
    setInitialAmount("");
    return result;
  };

  const getCustomerInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  // Helper to format relative date
  const formatRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  // Get transactions for selected customer
  const selectedCustomerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];
    return udharList
      .filter((u) => u.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedCustomer, udharList]);

  // Handle customer edit
  const handleEditCustomer = async (data) => {
    if (!editingCustomer) return;
    const result = await updateCustomer(editingCustomer.id, data);
    if (result.success) {
      toast.success("Customer updated");
      setEditingCustomer(null);
      // Update selected customer if viewing
      if (selectedCustomer?.id === editingCustomer.id) {
        setSelectedCustomer({ ...selectedCustomer, ...data });
      }
    } else {
      toast.error("Failed to update customer");
    }
  };

  // Handle customer delete
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    const result = await deleteCustomer(customerToDelete.id);
    if (result.success) {
      toast.success("Customer deleted");
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      // Close detail view if deleting current customer
      if (selectedCustomer?.id === customerToDelete.id) {
        setSelectedCustomer(null);
      }
    } else {
      toast.error("Failed to delete customer");
    }
  };

  // Handle payment for udhar
  const handleOpenPayment = (txn) => {
    const total = txn.amount || (txn.cashAmount || 0) + (txn.onlineAmount || 0);
    const paid = txn.paidAmount || (txn.paidCash || 0) + (txn.paidOnline || 0);
    const pending = Math.max(0, total - paid);

    setPaymentUdhar(txn);
    setPaymentAmount(pending.toString());
    setPaymentDialogOpen(true);
  };

  // Handle receipt upload for payment (supports multiple receipts)
  const handleReceiptSelect = async (e, isQuickCollect = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = isQuickCollect
      ? setIsUploadingQuickReceipt
      : setIsUploadingReceipt;
    const setReceipts = isQuickCollect
      ? setQuickCollectReceipts
      : setPaymentReceipts;
    const currentReceipts = isQuickCollect
      ? quickCollectReceipts
      : paymentReceipts;

    setUploading(true);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
        maxSizeKB: 500,
      });

      // Upload file
      const formData = new FormData();
      formData.append("file", compressedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { url } = await response.json();
        setReceipts([...currentReceipts, url]);
        toast.success("Receipt uploaded");
      } else {
        // Fallback to local preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setReceipts([...currentReceipts, e.target.result]);
        };
        reader.readAsDataURL(compressedFile);
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      // Reset the input
      e.target.value = "";
    }
  };

  // Remove a receipt from the list
  const handleRemoveReceipt = (index, isQuickCollect = false) => {
    if (isQuickCollect) {
      setQuickCollectReceipts((prev) => prev.filter((_, i) => i !== index));
    } else {
      setPaymentReceipts((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentUdhar || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      // Use first receipt or null
      const receiptUrl = paymentReceipts.length > 0 ? paymentReceipts[0] : null;

      const result = await recordDeposit(
        paymentUdhar.id,
        Number(paymentAmount),
        receiptUrl,
      );

      if (result.success) {
        toast.success(
          `₹${Number(paymentAmount).toLocaleString()} payment recorded`,
        );
        setPaymentDialogOpen(false);
        setPaymentUdhar(null);
        setPaymentAmount("");
        setPaymentReceipts([]);
      } else {
        toast.error(result.error || "Failed to record payment");
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleMarkFullPaidFromDialog = async () => {
    if (!paymentUdhar) return;

    setIsSubmittingPayment(true);
    try {
      // Use first receipt or null
      const receiptUrl = paymentReceipts.length > 0 ? paymentReceipts[0] : null;

      const result = await markFullPaid(paymentUdhar.id, receiptUrl);

      if (result.success) {
        toast.success("Marked as fully paid");
        setPaymentDialogOpen(false);
        setPaymentUdhar(null);
        setPaymentAmount("");
        setPaymentReceipts([]);
      } else {
        toast.error(result.error || "Failed to mark as paid");
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Quick collect from customer card
  const handleQuickCollect = (customer) => {
    setQuickCollectCustomer(customer);
    setQuickCollectAmount(customer.pendingAmount.toString());
    setQuickCollectReceipts([]);
    setQuickCollectNotes("");
    setQuickCollectOpen(true);
  };

  const handleQuickCollectSubmit = async () => {
    if (
      !quickCollectCustomer ||
      !quickCollectAmount ||
      Number(quickCollectAmount) <= 0
    ) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmittingQuickCollect(true);
    try {
      // Get the oldest pending udhar for this customer
      const customerUdhars = udharList
        .filter(
          (u) =>
            u.customerId === quickCollectCustomer.id &&
            u.paymentStatus !== "paid",
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (customerUdhars.length === 0) {
        toast.error("No pending Udhar found");
        return;
      }

      let remainingAmount = Number(quickCollectAmount);
      let isFirstPayment = true;

      // Use first receipt or null
      const receiptUrl =
        quickCollectReceipts.length > 0 ? quickCollectReceipts[0] : null;

      // Apply payment to oldest udhar entries first
      for (const udhar of customerUdhars) {
        if (remainingAmount <= 0) break;

        const total =
          udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
        const paid =
          udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
        const pending = Math.max(0, total - paid);

        if (pending <= 0) continue;

        const paymentForThis = Math.min(remainingAmount, pending);
        // Only attach receipt and notes to the first payment
        const result = await recordDeposit(
          udhar.id,
          paymentForThis,
          isFirstPayment ? receiptUrl : null,
          isFirstPayment ? quickCollectNotes : null,
        );

        if (!result.success) {
          toast.error(result.error || "Failed to record payment");
          return;
        }

        remainingAmount -= paymentForThis;
        isFirstPayment = false;
      }

      const customerId = quickCollectCustomer.id;
      toast.success(`₹${Number(quickCollectAmount).toLocaleString()} collected`);
      setQuickCollectOpen(false);
      setQuickCollectCustomer(null);
      setQuickCollectAmount("");
      setQuickCollectReceipts([]);
      setQuickCollectNotes("");
      // Keep the collapsible open for the customer
      setExpandedCustomerId(customerId);
    } finally {
      setIsSubmittingQuickCollect(false);
    }
  };

  // Get full customer data with stats
  const getFullCustomerData = (customerId) => {
    return customersWithStats.find((c) => c.id === customerId);
  };

  const loading = customersLoading || udharLoading;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} customer{customers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => {
            if (!isOnline) {
              toast.error("Cannot add while offline");
              return;
            }
            setNewCustomerWithAmount(true);
            setCustomerFormOpen(true);
          }}
          disabled={!isOnline}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary Card */}
      {customersWithStats.length > 0 &&
        (() => {
          const totalUdhar = customersWithStats.reduce(
            (sum, c) => sum + c.totalAmount,
            0,
          );
          const totalCollected = customersWithStats.reduce(
            (sum, c) => sum + c.paidAmount,
            0,
          );
          const totalPending = customersWithStats.reduce(
            (sum, c) => sum + c.pendingAmount,
            0,
          );
          return (
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Total Udhar</p>
                    <p
                      className={cn(
                        "font-bold truncate",
                        getAmountTextSize(totalUdhar, "lg"),
                      )}
                    >
                      ₹{totalUdhar.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-amber-500/20 flex-shrink-0" />
                  <div className="text-center flex-1 min-w-0">
                    <p className="text-xs text-green-600">Collected</p>
                    <p
                      className={cn(
                        "font-bold text-green-600 truncate",
                        getAmountTextSize(totalCollected, "lg"),
                      )}
                    >
                      ₹{totalCollected.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-amber-500/20 flex-shrink-0" />
                  <div className="text-center flex-1 min-w-0">
                    <p className="text-xs text-amber-600">Pending</p>
                    <p
                      className={cn(
                        "font-bold text-amber-600 truncate",
                        getAmountTextSize(totalPending, "lg"),
                      )}
                    >
                      ₹{totalPending.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {/* Customer List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-l-4 border-l-muted">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            {searchQuery ? (
              <>
                <p>No customers found</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <p>No customers yet</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setCustomerFormOpen(true)}
                  disabled={!isOnline}
                >
                  Add your first customer
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {visibleCustomers.map((customer) => {
            const isExpanded = expandedCustomerId === customer.id;

            // Get all payments for this customer from all udhar transactions
            const customerPayments = isExpanded
              ? udharList
                  .filter((u) => u.customerId === customer.id)
                  .flatMap((u) =>
                    (u.payments || []).map((p) => ({
                      ...p,
                      udharId: u.id,
                      udharAmount:
                        u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0),
                    })),
                  )
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
              : [];

            // Get all khata photos for this customer
            const customerKhataPhotos = isExpanded
              ? udharList
                  .filter((u) => u.customerId === customer.id)
                  .flatMap((u) => u.khataPhotos || u.billImages || [])
              : [];

            return (
              <Card
                key={customer.id}
                className={cn(
                  "overflow-hidden transition-all",
                  customer.pendingAmount > 0
                    ? "border-l-4 border-l-amber-500"
                    : "border-l-4 border-l-green-500",
                  isExpanded && " shadow-md bg-blue-800",
                )}
              >
                <CardContent className="p-0">
                  {/* Main Row - tap to expand/collapse */}
                  <div
                    className={cn(
                      "p-3 cursor-pointer  active:scale-[0.99] transition-all",
                      isExpanded && "bg-blue-800"
                    )}
                    onClick={() =>
                      setExpandedCustomerId(isExpanded ? null : customer.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar - tap to open details */}
                      <Avatar
                        className="h-12 w-12 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(customer);
                        }}
                      >
                        <AvatarImage src={customer.profilePicture} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getCustomerInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">
                            {customer.name}
                          </p>
                          {customer.transactionCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {customer.transactionCount} txn
                            </Badge>
                          )}
                        </div>
                        {customer.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </p>
                        )}
                        {customer.pendingAmount > 0 && (
                          <p className="text-sm font-semibold text-amber-600 mt-1">
                            Pending: ₹{customer.pendingAmount.toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Single Chevron - indicates expandable */}
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </div>

                  {/* Collapsible Section with Progress, Payment History & Actions */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t bg-muted/30">
                      {/* Remaining Amount - Prominent on top */}
                      {customer.pendingAmount > 0 && (
                        <div className="pt-3 pb-2">
                          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                            <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Remaining Balance</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                              ₹{customer.pendingAmount.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Payment Progress Bar - only show if there's any transaction */}
                      {customer.totalAmount > 0 && (
                        <div className="pt-2 pb-2">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">
                              Total: ₹{customer.totalAmount.toLocaleString()}
                            </span>
                            <span className="text-green-600">
                              Paid: ₹{customer.paidAmount.toLocaleString()}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                customer.pendingAmount === 0
                                  ? "bg-green-500"
                                  : "bg-gradient-to-r from-green-500 to-green-400",
                              )}
                              style={{
                                width: `${customer.totalAmount > 0 ? (customer.paidAmount / customer.totalAmount) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Payment History Timeline */}
                      {customerPayments.length > 0 && (
                        <div className="pt-2 pb-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Payment History
                          </p>
                          <div className="space-y-0 max-h-[150px] overflow-y-auto">
                            {customerPayments
                              .slice(0, 5)
                              .map((payment, index, arr) => (
                                <div key={payment.id} className="flex">
                                  {/* Timeline line and dot */}
                                  <div className="flex flex-col items-center mr-3">
                                    <div
                                      className={cn(
                                        "w-3 h-3 rounded-full flex items-center justify-center",
                                        index === 0
                                          ? "bg-green-500"
                                          : "bg-green-400",
                                      )}
                                    >
                                      <CheckCircle2 className="w-2 h-2 text-white" />
                                    </div>
                                    {index < arr.length - 1 && (
                                      <div className="w-0.5 h-full min-h-[20px] bg-green-300" />
                                    )}
                                  </div>

                                  {/* Payment details */}
                                  <div className="flex-1 pb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-green-600 text-sm">
                                        ₹{payment.amount.toLocaleString()}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        — {formatRelativeDate(payment.date)}
                                      </span>
                                      {payment.receiptUrl && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-6 px-2 text-xs gap-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setImageViewerSrc(
                                              payment.receiptUrl,
                                            );
                                            setImageViewerOpen(true);
                                          }}
                                        >
                                          <Receipt className="h-3 w-3" />
                                          Receipt
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPaymentToDelete({
                                            udharId: payment.udharId,
                                            paymentId: payment.id,
                                            amount: payment.amount,
                                          });
                                          setDeletePaymentDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    {payment.notes && (
                                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                                        &quot;{payment.notes}&quot;
                                      </p>
                                    )}
                                    {payment.isFinalPayment && (
                                      <span className="text-xs text-green-600">
                                        Final payment
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            {customerPayments.length > 5 && (
                              <p className="text-xs text-muted-foreground pl-6">
                                +{customerPayments.length - 5} more payments
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Khata Photos */}
                      {customerKhataPhotos.length > 0 && (
                        <div className="pt-2 pb-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Khata Photos ({customerKhataPhotos.length})
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {customerKhataPhotos.slice(0, 6).map((photo, idx) => (
                              <div
                                key={idx}
                                className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border bg-muted cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageViewerSrc(customerKhataPhotos);
                                  setImageViewerOpen(true);
                                }}
                              >
                                <img
                                  src={photo}
                                  alt={`Khata ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {customerKhataPhotos.length > 6 && (
                              <div
                                className="w-16 h-16 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImageViewerSrc(customerKhataPhotos);
                                  setImageViewerOpen(true);
                                }}
                              >
                                <span className="text-xs text-muted-foreground">
                                  +{customerKhataPhotos.length - 6}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        {/* View Details Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-10 text-sm gap-2"
                          onClick={() => {
                            setSelectedCustomer(customer);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                          View Details
                        </Button>
                        {/* Collect Payment Button - only show if pending amount */}
                        {customer.pendingAmount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-10 text-sm gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            onClick={() => {
                              if (!isOnline) {
                                toast.error("Cannot collect while offline");
                                return;
                              }
                              handleQuickCollect(customer);
                            }}
                            disabled={!isOnline}
                          >
                            <CreditCard className="h-4 w-4" />
                            Collect
                          </Button>
                        )}
                        {/* Quick Add Udhar Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-10 text-sm gap-2 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          onClick={() => {
                            if (!isOnline) {
                              toast.error("Cannot add while offline");
                              return;
                            }
                            setQuickAddCustomer(customer);
                            setQuickAddOpen(true);
                          }}
                          disabled={!isOnline}
                        >
                          <Plus className="h-4 w-4" />
                          Udhar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {/* Load More Trigger */}
          <LoadMoreTrigger
            loadMoreRef={customersLoadMoreRef}
            hasMore={hasMoreCustomers}
            remainingCount={customersRemaining}
            onLoadMore={loadMoreCustomers}
          />
        </div>
      )}

      {/* Customer Form - Only show when NOT editing */}
      {!editingCustomer && (
        <CustomerForm
          open={customerFormOpen}
          onOpenChange={(open) => {
            setCustomerFormOpen(open);
            if (!open) {
              setNewCustomerWithAmount(false);
              setInitialAmount("");
            }
          }}
          onSubmit={
            newCustomerWithAmount ? handleAddCustomerWithAmount : addCustomer
          }
          title={
            newCustomerWithAmount ? "Add Customer with Udhar" : "Add Customer"
          }
          showInitialAmount={newCustomerWithAmount}
          initialAmount={initialAmount}
          onInitialAmountChange={setInitialAmount}
        />
      )}

      {/* Udhar Form */}
      <UdharForm
        open={udharFormOpen}
        onOpenChange={setUdharFormOpen}
        onSubmit={addUdhar}
        onAddCustomer={addCustomer}
        customers={customers}
        defaultCustomerId={selectedCustomerId}
      />

      {/* Quick Add Udhar Sheet - slides from top */}
      <Sheet open={quickAddOpen} onOpenChange={setQuickAddOpen}>
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
                onClick={() => {
                  setQuickAddOpen(false);
                  setQuickAddAmount("");
                  setQuickAddBillImages([]);
                  setQuickAddNotes("");
                }}
                className="h-9 px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <SheetTitle className="text-base font-semibold flex-1 text-center">
                Add Udhar
              </SheetTitle>
              <Button
                size="sm"
                onClick={handleQuickAdd}
                disabled={!isOnline || !quickAddAmount || Number(quickAddAmount) <= 0 || isSubmittingQuickAdd}
                className="h-9 px-3"
              >
                {isSubmittingQuickAdd ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {quickAddCustomer && (
                <p className="text-sm text-muted-foreground text-center">
                  Adding Udhar for <strong>{quickAddCustomer.name}</strong>
                </p>
              )}

              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  ref={quickAddInputRef}
                  type="number"
                  inputMode="numeric"
                  value={quickAddAmount}
                  onChange={(e) => setQuickAddAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-3xl h-16 font-bold text-center"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  value={quickAddNotes}
                  onChange={(e) => setQuickAddNotes(e.target.value)}
                  placeholder="Enter notes"
                  className="h-10"
                />
              </div>

              {/* Bill Images */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4" />
                  Bill Images (Optional)
                </Label>
                <div className="flex gap-2">
                  <input
                    ref={quickAddBillInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleQuickAddBillSelect}
                    className="hidden"
                    multiple
                  />
                  <input
                    ref={quickAddBillGalleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQuickAddBillSelect}
                    className="hidden"
                    multiple
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => quickAddBillInputRef.current?.click()}
                    disabled={isUploadingQuickAddBill}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => quickAddBillGalleryInputRef.current?.click()}
                    disabled={isUploadingQuickAddBill}
                    className="flex-1"
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Gallery
                  </Button>
                </div>
                {isUploadingQuickAddBill && (
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                )}
                {quickAddBillImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {quickAddBillImages.map((url, idx) => (
                      <div key={idx} className="relative aspect-square">
                        <img
                          src={url}
                          alt={`Bill ${idx + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={() =>
                            setQuickAddBillImages((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Drag handle at bottom */}
          <div className="flex justify-center pb-3 pt-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Quick Collect Sheet - slides from top */}
      <Sheet open={quickCollectOpen} onOpenChange={setQuickCollectOpen}>
        <SheetContent
          side="top"
          className="rounded-b-2xl p-0 flex flex-col max-h-[80vh]"
          hideClose
        >
          {/* Header with action buttons */}
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuickCollectOpen(false);
                  setQuickCollectCustomer(null);
                  setQuickCollectAmount("");
                  setQuickCollectReceipts([]);
                  setQuickCollectNotes("");
                }}
                className="h-9 px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <SheetTitle className="text-base font-semibold flex-1 text-center">
                Collect Payment
              </SheetTitle>
              <Button
                size="sm"
                onClick={handleQuickCollectSubmit}
                disabled={
                  !isOnline ||
                  !quickCollectAmount ||
                  Number(quickCollectAmount) <= 0 ||
                  isSubmittingQuickCollect
                }
                className="h-9 px-3 bg-green-600 hover:bg-green-700"
              >
                {isSubmittingQuickCollect ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Collect
                  </>
                )}
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {quickCollectCustomer && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Collecting from <strong>{quickCollectCustomer.name}</strong>
                    </span>
                    <span className="font-bold text-lg text-amber-600">
                      ₹{quickCollectCustomer.pendingAmount?.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-2">
                <Label>Amount to Collect (₹)</Label>
                <Input
                  ref={quickCollectInputRef}
                  type="number"
                  inputMode="numeric"
                  value={quickCollectAmount}
                  onChange={(e) => setQuickCollectAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-3xl h-16 font-bold text-center"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  value={quickCollectNotes}
                  onChange={(e) => setQuickCollectNotes(e.target.value)}
                  placeholder="Enter notes"
                  className="h-10"
                />
              </div>

              {/* Payment Receipts Upload - Multiple */}
              <div className="space-y-2">
                <Label className="text-sm">Payment Receipts (Optional)</Label>
                <input
                  ref={quickReceiptInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleReceiptSelect(e, true)}
                  className="hidden"
                />
                <input
                  ref={quickReceiptGalleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleReceiptSelect(e, true)}
                  className="hidden"
                />

                {/* Show uploaded receipts */}
                {quickCollectReceipts.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {quickCollectReceipts.map((receipt, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden border bg-muted"
                      >
                        <img
                          src={receipt}
                          alt={`Receipt ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => {
                            setImageViewerSrc(receipt);
                            setImageViewerOpen(true);
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => handleRemoveReceipt(index, true)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {isUploadingQuickReceipt && (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => quickReceiptInputRef.current?.click()}
                    className="flex-1 h-10 gap-1.5"
                    disabled={isUploadingQuickReceipt}
                  >
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      quickReceiptGalleryInputRef.current?.click()
                    }
                    className="flex-1 h-10 gap-1.5"
                    disabled={isUploadingQuickReceipt}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Gallery
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Attach UPI screenshots or payment proofs
                </p>
              </div>
            </div>
          </div>

          {/* Drag handle at bottom */}
          <div className="flex justify-center pb-3 pt-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Sheet - slides from top */}
      <Sheet open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <SheetContent
          side="top"
          className="rounded-b-2xl p-0 flex flex-col max-h-[80vh]"
          hideClose
        >
          {/* Header with action buttons */}
          <SheetHeader className="px-4 py-3 border-b">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPaymentDialogOpen(false);
                  setPaymentUdhar(null);
                  setPaymentAmount("");
                  setPaymentReceipts([]);
                }}
                className="h-9 px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <SheetTitle className="text-base font-semibold flex-1 text-center">
                Record Payment
              </SheetTitle>
              <Button
                size="sm"
                onClick={handleRecordPayment}
                disabled={
                  !isOnline || !paymentAmount || Number(paymentAmount) <= 0 || isSubmittingPayment
                }
                className="h-9 px-3 bg-green-600 hover:bg-green-700"
              >
                {isSubmittingPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Record
                  </>
                )}
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {paymentUdhar &&
                (() => {
                  const totalAmount =
                    paymentUdhar.amount ||
                    (paymentUdhar.cashAmount || 0) +
                      (paymentUdhar.onlineAmount || 0);
                  const paidAmount =
                    paymentUdhar.paidAmount ||
                    (paymentUdhar.paidCash || 0) +
                      (paymentUdhar.paidOnline || 0);
                  const pendingAmount = Math.max(0, totalAmount - paidAmount);

                  return (
                    <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Total Amount
                        </span>
                        <span className="font-bold text-lg">
                          ₹{totalAmount.toLocaleString()}
                        </span>
                      </div>
                      {paidAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Already Paid</span>
                          <span className="font-medium text-green-600">
                            ₹{paidAmount.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm border-t pt-3">
                        <span className="text-amber-600 font-medium">
                          Pending
                        </span>
                        <span className="font-bold text-lg text-amber-600">
                          ₹{pendingAmount.toLocaleString()}
                        </span>
                      </div>
                      {paymentUdhar.notes && (
                        <div className="flex justify-between text-xs text-muted-foreground pt-1">
                          <span>Notes</span>
                          <span className="truncate max-w-[150px]">
                            {paymentUdhar.notes}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {/* Payment Amount Input */}
              <div className="space-y-2">
                <Label>Payment Amount (₹)</Label>
                <Input
                  ref={paymentInputRef}
                  type="number"
                  inputMode="numeric"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-3xl h-16 font-bold text-center"
                />
              </div>

              {/* Payment Receipts Upload - Multiple */}
              <div className="space-y-2">
                <Label className="text-sm">Payment Receipts (Optional)</Label>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleReceiptSelect(e, false)}
                  className="hidden"
                />
                <input
                  ref={receiptGalleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleReceiptSelect(e, false)}
                  className="hidden"
                />

                {/* Show uploaded receipts */}
                {paymentReceipts.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {paymentReceipts.map((receipt, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden border bg-muted"
                      >
                        <img
                          src={receipt}
                          alt={`Receipt ${index + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => {
                            setImageViewerSrc(receipt);
                            setImageViewerOpen(true);
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => handleRemoveReceipt(index, false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {isUploadingReceipt && (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => receiptInputRef.current?.click()}
                    className="flex-1 h-10 gap-1.5"
                    disabled={isUploadingReceipt}
                  >
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => receiptGalleryInputRef.current?.click()}
                    className="flex-1 h-10 gap-1.5"
                    disabled={isUploadingReceipt}
                  >
                    <ImagePlus className="h-4 w-4" />
                    Gallery
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Attach UPI screenshots or payment proofs
                </p>
              </div>

              {/* Mark Full Paid Button */}
              {paymentUdhar &&
                (() => {
                  const totalAmount =
                    paymentUdhar.amount ||
                    (paymentUdhar.cashAmount || 0) +
                      (paymentUdhar.onlineAmount || 0);
                  const paidAmount =
                    paymentUdhar.paidAmount ||
                    (paymentUdhar.paidCash || 0) +
                      (paymentUdhar.paidOnline || 0);
                  const pendingAmount = totalAmount - paidAmount;

                  return pendingAmount > 0 ? (
                    <Button
                      variant="outline"
                      onClick={handleMarkFullPaidFromDialog}
                      className="w-full h-12 text-green-600 border-green-200 hover:bg-green-50"
                      disabled={!isOnline}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark Full Amount as Paid
                    </Button>
                  ) : null;
                })()}
            </div>
          </div>

          {/* Drag handle at bottom */}
          <div className="flex justify-center pb-3 pt-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Customer Detail Drawer */}
      <Sheet
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      >
        <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] p-0" hideClose>
          {selectedCustomer && (
            <>
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header with actions */}
              <SheetHeader className="px-4 pb-3 border-b">
                <div className="flex items-center gap-3">
                  {/* Profile Picture */}
                  <Avatar
                    className={cn(
                      "h-14 w-14 flex-shrink-0",
                      selectedCustomer.profilePicture &&
                        "cursor-pointer hover:ring-2 hover:ring-primary transition-all",
                    )}
                    onClick={() => {
                      if (selectedCustomer.profilePicture) {
                        setImageViewerSrc(selectedCustomer.profilePicture);
                        setImageViewerOpen(true);
                      }
                    }}
                  >
                    <AvatarImage src={selectedCustomer.profilePicture} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                      {getCustomerInitials(selectedCustomer.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name and info */}
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-xl font-bold truncate">{selectedCustomer.name}</SheetTitle>
                    {selectedCustomer.phone && (
                      <a
                        href={`tel:${selectedCustomer.phone}`}
                        className="text-sm text-primary flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        {selectedCustomer.phone}
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (!isOnline) {
                          toast.error("Cannot edit while offline");
                          return;
                        }
                        setEditingCustomer(selectedCustomer);
                      }}
                      disabled={!isOnline}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (!isOnline) {
                          toast.error("Cannot delete while offline");
                          return;
                        }
                        setCustomerToDelete(selectedCustomer);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={!isOnline}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 h-[calc(85vh-100px)]">
                <div className="p-4 space-y-4">
                  {/* Address if available */}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {selectedCustomer.address}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-muted/50 text-center min-w-0">
                      <p className="text-[10px] text-muted-foreground">Total</p>
                      <p
                        className={cn(
                          "font-bold truncate",
                          getAmountTextSize(
                            selectedCustomer.totalAmount || 0,
                            "lg",
                          ),
                        )}
                      >
                        ₹{(selectedCustomer.totalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-500/10 text-center min-w-0">
                      <p className="text-[10px] text-green-600">Paid</p>
                      <p
                        className={cn(
                          "font-bold text-green-600 truncate",
                          getAmountTextSize(
                            selectedCustomer.paidAmount || 0,
                            "lg",
                          ),
                        )}
                      >
                        ₹{(selectedCustomer.paidAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 text-center min-w-0">
                      <p className="text-[10px] text-amber-600">Pending</p>
                      <p
                        className={cn(
                          "font-bold text-amber-600 truncate",
                          getAmountTextSize(
                            selectedCustomer.pendingAmount || 0,
                            "lg",
                          ),
                        )}
                      >
                        ₹{(selectedCustomer.pendingAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Add Udhar Button */}
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (!isOnline) {
                        toast.error("Cannot add while offline");
                        return;
                      }
                      setQuickAddCustomer(selectedCustomer);
                      setQuickAddOpen(true);
                    }}
                    disabled={!isOnline}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Udhar
                  </Button>

                  {/* Transactions Section - Directly visible */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Transactions ({selectedCustomerTransactions.length})
                    </h3>

                    {selectedCustomerTransactions.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-xl">
                        <IndianRupee className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {selectedCustomerTransactions.map((txn) => {
                          const total = txn.amount || (txn.cashAmount || 0) + (txn.onlineAmount || 0);
                          const paid = txn.paidAmount || (txn.paidCash || 0) + (txn.paidOnline || 0);
                          const pending = Math.max(0, total - paid);
                          const isPaid = txn.paymentStatus === "paid";
                          const isPartial = txn.paymentStatus === "partial";
                          const hasPayments = txn.payments && txn.payments.length > 0;
                          const isExpanded = expandedUdharId === txn.id;

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
                                  className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                                  onClick={() => setExpandedUdharId(isExpanded ? null : txn.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-lg font-bold">₹{total.toLocaleString()}</span>
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
                                        {new Date(txn.date).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
                                        {txn.notes && ` • ${txn.notes}`}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {!isPaid && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenPayment(txn);
                                          }}
                                          disabled={!isOnline}
                                        >
                                          <CreditCard className="h-3 w-3 mr-1" />
                                          Pay
                                        </Button>
                                      )}
                                      {hasPayments && (
                                        <ChevronDown
                                          className={cn(
                                            "h-4 w-4 text-muted-foreground transition-transform",
                                            isExpanded && "rotate-180"
                                          )}
                                        />
                                      )}
                                    </div>
                                  </div>

                                  {/* Progress bar for partial */}
                                  {isPartial && (
                                    <div className="mt-2">
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-green-600">Paid: ₹{paid.toLocaleString()}</span>
                                        <span className="text-amber-600">Pending: ₹{pending.toLocaleString()}</span>
                                      </div>
                                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-green-500 rounded-full"
                                          style={{ width: `${(paid / total) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Expanded Section */}
                                {isExpanded && hasPayments && (
                                  <div className="px-3 pb-3 border-t bg-muted/20">
                                    <div className="pt-3">
                                      <p className="text-xs font-medium text-muted-foreground mb-2">Payment History</p>
                                      <div className="space-y-0">
                                        {txn.payments
                                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                                          .map((payment, index, arr) => (
                                            <div key={payment.id} className="flex">
                                              <div className="flex flex-col items-center mr-3">
                                                <div
                                                  className={cn(
                                                    "w-3 h-3 rounded-full flex items-center justify-center",
                                                    index === 0 ? "bg-green-500" : "bg-green-400"
                                                  )}
                                                >
                                                  <CheckCircle2 className="w-2 h-2 text-white" />
                                                </div>
                                                {index < arr.length - 1 && (
                                                  <div className="w-0.5 h-full min-h-[20px] bg-green-300" />
                                                )}
                                              </div>
                                              <div className="flex-1 pb-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="font-semibold text-green-600">
                                                    ₹{payment.amount.toLocaleString()}
                                                  </span>
                                                  <span className="text-xs text-muted-foreground">
                                                    — {new Date(payment.date).toLocaleDateString("en-IN", {
                                                      day: "numeric",
                                                      month: "short",
                                                    })}
                                                  </span>
                                                  {payment.receiptUrl && (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-5 px-2 text-xs"
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
                                                {payment.notes && (
                                                  <p className="text-xs text-muted-foreground mt-0.5 italic">
                                                    &quot;{payment.notes}&quot;
                                                  </p>
                                                )}
                                                {payment.isFinalPayment && (
                                                  <span className="text-xs text-green-600">Final payment</span>
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
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Customer Form */}
      {editingCustomer && (
        <CustomerForm
          open={!!editingCustomer}
          onOpenChange={(open) => {
            if (!open) setEditingCustomer(null);
          }}
          onSubmit={handleEditCustomer}
          initialData={editingCustomer}
          title="Edit Customer"
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {customerToDelete?.name} and all
              their Udhar transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payment Confirmation Dialog */}
      <AlertDialog open={deletePaymentDialogOpen} onOpenChange={setDeletePaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the payment of ₹{paymentToDelete?.amount?.toLocaleString() || 0}. 
              The udhar balance will be recalculated. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (paymentToDelete && deletePayment) {
                  const result = await deletePayment(
                    paymentToDelete.udharId,
                    paymentToDelete.paymentId
                  );
                  if (result?.success) {
                    toast.success("Payment deleted");
                  } else {
                    toast.error(result?.error || "Failed to delete payment");
                  }
                }
                setPaymentToDelete(null);
                setDeletePaymentDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Udhar Transactions Drawer */}
      <Sheet open={udharDrawerOpen} onOpenChange={setUdharDrawerOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0" hideClose>
          {udharDrawerCustomer && (() => {
            const customerTransactions = udharList
              .filter((u) => u.customerId === udharDrawerCustomer.id)
              .sort((a, b) => new Date(b.date) - new Date(a.date));

            return (
              <>
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Header */}
                <SheetHeader className="px-4 pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={udharDrawerCustomer.profilePicture} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getCustomerInitials(udharDrawerCustomer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-lg">{udharDrawerCustomer.name}</SheetTitle>
                      <p className="text-sm text-muted-foreground">
                        {customerTransactions.length} transactions
                      </p>
                    </div>
                  </div>
                </SheetHeader>

                <ScrollArea className="flex-1 h-[calc(90vh-120px)]">
                  <div className="p-4 space-y-3">
                    {customerTransactions.length === 0 ? (
                      <div className="text-center py-8">
                        <Banknote className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No transactions yet</p>
                      </div>
                    ) : (
                      customerTransactions.map((txn) => {
                        const total = txn.amount || (txn.cashAmount || 0) + (txn.onlineAmount || 0);
                        const paid = txn.paidAmount || (txn.paidCash || 0) + (txn.paidOnline || 0);
                        const pending = Math.max(0, total - paid);
                        const isPaid = txn.paymentStatus === "paid";
                        const isPartial = txn.paymentStatus === "partial";
                        const hasPayments = txn.payments && txn.payments.length > 0;
                        const hasBillImages = (txn.khataPhotos?.length > 0 || txn.billImages?.length > 0);
                        const hasExpandableContent = hasPayments || hasBillImages;
                        const isExpanded = expandedUdharId === txn.id;

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
                              {/* Main Row */}
                              <div
                                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                                onClick={() => setExpandedUdharId(isExpanded ? null : txn.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xl font-bold">₹{total.toLocaleString()}</span>
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
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(txn.date).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                      {txn.notes && ` • ${txn.notes}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!isPaid && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenPayment(txn);
                                        }}
                                        disabled={!isOnline}
                                      >
                                        <CreditCard className="h-4 w-4 mr-1" />
                                        Pay
                                      </Button>
                                    )}
                                    {hasExpandableContent && (
                                      <ChevronDown
                                        className={cn(
                                          "h-5 w-5 text-muted-foreground transition-transform",
                                          isExpanded && "rotate-180"
                                        )}
                                      />
                                    )}
                                  </div>
                                </div>

                                {/* Progress bar for partial */}
                                {isPartial && (
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span className="text-green-600">Paid: ₹{paid.toLocaleString()}</span>
                                      <span className="text-amber-600">Pending: ₹{pending.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-green-500 rounded-full transition-all"
                                        style={{ width: `${(paid / total) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Expanded Section */}
                              {isExpanded && (
                                <div className="px-4 pb-4 border-t bg-muted/20">
                                  {/* Bill Images */}
                                  {(txn.khataPhotos?.length > 0 || txn.billImages?.length > 0) && (
                                    <div className="pt-3">
                                      <p className="text-xs font-medium text-muted-foreground mb-2">Bill Images</p>
                                      <div className="flex gap-2 overflow-x-auto pb-1">
                                        {[...(txn.khataPhotos || []), ...(txn.billImages || [])].map((photo, idx) => (
                                          <div
                                            key={idx}
                                            className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border bg-muted cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setImageViewerSrc([...(txn.khataPhotos || []), ...(txn.billImages || [])]);
                                              setImageViewerOpen(true);
                                            }}
                                          >
                                            <img src={photo} alt={`Bill ${idx + 1}`} className="w-full h-full object-cover" />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Payment History */}
                                  {hasPayments && (
                                    <div className="pt-3">
                                      <p className="text-xs font-medium text-muted-foreground mb-2">Payment History</p>
                                      <div className="space-y-0">
                                        {txn.payments
                                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                                          .map((payment, index, arr) => (
                                            <div key={payment.id} className="flex">
                                              <div className="flex flex-col items-center mr-3">
                                                <div
                                                  className={cn(
                                                    "w-3 h-3 rounded-full flex items-center justify-center",
                                                    index === 0 ? "bg-green-500" : "bg-green-400"
                                                  )}
                                                >
                                                  <CheckCircle2 className="w-2 h-2 text-white" />
                                                </div>
                                                {index < arr.length - 1 && (
                                                  <div className="w-0.5 h-full min-h-[24px] bg-green-300" />
                                                )}
                                              </div>
                                              <div className="flex-1 pb-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="font-semibold text-green-600">
                                                    ₹{payment.amount.toLocaleString()}
                                                  </span>
                                                  <span className="text-xs text-muted-foreground">
                                                    — {formatRelativeDate(payment.date)}
                                                  </span>
                                                  {payment.receiptUrl && (
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-6 px-2 text-xs"
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
                                                {payment.notes && (
                                                  <p className="text-xs text-muted-foreground mt-0.5 italic">
                                                    &quot;{payment.notes}&quot;
                                                  </p>
                                                )}
                                                {payment.isFinalPayment && (
                                                  <span className="text-xs text-green-600">Final payment</span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Delete Button */}
                                  <div className="pt-3 border-t mt-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!isOnline) {
                                          toast.error("Cannot delete while offline");
                                          return;
                                        }
                                        if (confirm("Delete this Udhar transaction?")) {
                                          const result = await deleteUdhar(txn.id);
                                          if (result.success) {
                                            toast.success("Udhar deleted");
                                          } else {
                                            toast.error("Failed to delete");
                                          }
                                        }
                                      }}
                                      disabled={!isOnline}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Transaction
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
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
        src={imageViewerSrc}
        alt="Profile Picture"
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
      />
    </div>
  );
}
