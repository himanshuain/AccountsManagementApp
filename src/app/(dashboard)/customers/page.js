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
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
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
  AlertDialogTrigger,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { compressImage } from "@/lib/image-compression";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { CustomerForm } from "@/components/CustomerForm";
import { UdharForm } from "@/components/UdharForm";
import { UdharList } from "@/components/UdharList";
import { toast } from "sonner";
import { cn, getAmountTextSize } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageViewer, ImageGalleryViewer } from "@/components/ImageViewer";
import { useProgressiveList, LoadMoreTrigger } from "@/hooks/useProgressiveList";
import { haptics } from "@/hooks/useHaptics";

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
    updateUdhar,
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

  // Filter chips state for mobile-first UX
  const [activeFilter, setActiveFilter] = useState("all"); // all, pending, partial, paid, high
  const [sortOrder, setSortOrder] = useState("smart"); // smart, highest, lowest, oldest, newest

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

  // Ref to track if image viewer was just closed (to prevent drawer from closing)
  const imageViewerJustClosedRef = useRef(false);

  // Gallery viewer state (for multiple images)
  const [galleryViewerOpen, setGalleryViewerOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  // Payment deletion state
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Collapsible sections state
  const [customersExpanded, setCustomersExpanded] = useState(true);
  const [udharExpanded, setUdharExpanded] = useState(false);

  // All udhar section filters
  const [udharStatusFilter, setUdharStatusFilter] = useState("all");
  const [udharCustomerFilter, setUdharCustomerFilter] = useState("all");
  const [udharAmountSort, setUdharAmountSort] = useState("newest");

  // All receipts sheet state
  const [allReceiptsSheetOpen, setAllReceiptsSheetOpen] = useState(false);
  const [allReceiptsGalleryOpen, setAllReceiptsGalleryOpen] = useState(false);
  const [allReceiptsGalleryImages, setAllReceiptsGalleryImages] = useState([]);
  const [allReceiptsGalleryInitialIndex, setAllReceiptsGalleryInitialIndex] = useState(0);

  // Udhar editing state
  const [udharToEdit, setUdharToEdit] = useState(null);

  // Customer khata photos sheet state
  const [khataPhotosSheetOpen, setKhataPhotosSheetOpen] = useState(false);
  const [deletingPhotoIndex, setDeletingPhotoIndex] = useState(null);

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
    return customers.map(customer => {
      const customerUdhar = udharList.filter(u => u.customerId === customer.id);

      const totalAmount = customerUdhar.reduce((sum, u) => {
        return sum + (u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0));
      }, 0);

      const paidAmount = customerUdhar.reduce((sum, u) => {
        return sum + (u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0));
      }, 0);

      const pendingAmount = Math.max(0, totalAmount - paidAmount);
      const transactionCount = customerUdhar.length;

      // Get the last transaction date for sorting
      const lastTransactionDate = customerUdhar.length > 0
        ? customerUdhar.reduce((latest, u) => {
            const uDate = new Date(u.date || u.createdAt || 0);
            return uDate > latest ? uDate : latest;
          }, new Date(0))
        : new Date(customer.createdAt || 0);

      return {
        ...customer,
        totalAmount,
        paidAmount,
        pendingAmount,
        transactionCount,
        lastTransactionDate,
      };
    });
  }, [customers, udharList]);

  // Handle opening customer from URL query parameter (e.g., from search)
  useEffect(() => {
    const openCustomerId = searchParams.get("open");
    if (openCustomerId && customersWithStats.length > 0 && !customersLoading) {
      const customerToOpen = customersWithStats.find(c => c.id === openCustomerId);
      if (customerToOpen) {
        setSelectedCustomer(customerToOpen);
        // Clear the query parameter from URL without triggering a navigation
        router.replace("/customers", { scroll: false });
      }
    }
  }, [searchParams, customersWithStats, customersLoading, router]);

  // Keep selectedCustomer in sync with updated data (fixes totalAmount not updating after transaction)
  useEffect(() => {
    if (selectedCustomer) {
      const updatedCustomer = customersWithStats.find(c => c.id === selectedCustomer.id);
      if (updatedCustomer && (
        updatedCustomer.totalAmount !== selectedCustomer.totalAmount ||
        updatedCustomer.paidAmount !== selectedCustomer.paidAmount ||
        updatedCustomer.pendingAmount !== selectedCustomer.pendingAmount ||
        updatedCustomer.transactionCount !== selectedCustomer.transactionCount
      )) {
        setSelectedCustomer(updatedCustomer);
      }
    }
  }, [customersWithStats, selectedCustomer]);

  // Filter and sort customers with smart defaults
  const filteredCustomers = useMemo(() => {
    let filtered = [...customersWithStats]; // Create copy to avoid mutating source

    // Search filter - context-aware (name, phone, or amount)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const numericQuery = parseFloat(query.replace(/[^\d.]/g, ""));
      filtered = filtered.filter(
        c =>
          c.name?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.address?.toLowerCase().includes(query) ||
          // Also search by pending amount
          (!isNaN(numericQuery) && c.pendingAmount >= numericQuery * 0.9 && c.pendingAmount <= numericQuery * 1.1)
      );
    }

    // Apply filter chips
    if (activeFilter === "pending") {
      filtered = filtered.filter(c => c.pendingAmount > 0 && c.paidAmount === 0);
    } else if (activeFilter === "partial") {
      filtered = filtered.filter(c => c.pendingAmount > 0 && c.paidAmount > 0);
    } else if (activeFilter === "paid") {
      filtered = filtered.filter(c => c.pendingAmount === 0 && c.totalAmount > 0);
    } else if (activeFilter === "high") {
      filtered = filtered.filter(c => c.pendingAmount >= 5000);
    }

    // Smart sorting based on active filter
    const effectiveSort = sortOrder === "smart" 
      ? (activeFilter === "pending" || activeFilter === "high" ? "highest" 
         : activeFilter === "partial" ? "oldest" 
         : activeFilter === "paid" ? "newest" 
         : "highest") // default: show highest pending first
      : sortOrder;

    if (effectiveSort === "highest") {
      return filtered.sort((a, b) => b.pendingAmount - a.pendingAmount);
    } else if (effectiveSort === "lowest") {
      return filtered.sort((a, b) => a.pendingAmount - b.pendingAmount);
    } else if (effectiveSort === "oldest") {
      return filtered.sort((a, b) => {
        const dateA = a.lastTransactionDate instanceof Date ? a.lastTransactionDate : new Date(a.lastTransactionDate || 0);
        const dateB = b.lastTransactionDate instanceof Date ? b.lastTransactionDate : new Date(b.lastTransactionDate || 0);
        return dateA - dateB;
      });
    } else if (effectiveSort === "newest") {
      return filtered.sort((a, b) => {
        const dateA = a.lastTransactionDate instanceof Date ? a.lastTransactionDate : new Date(a.lastTransactionDate || 0);
        const dateB = b.lastTransactionDate instanceof Date ? b.lastTransactionDate : new Date(b.lastTransactionDate || 0);
        return dateB - dateA;
      });
    }

    return filtered.sort((a, b) => b.pendingAmount - a.pendingAmount);
  }, [customersWithStats, searchQuery, activeFilter, sortOrder]);

  // Progressive loading for large customer lists
  const {
    visibleItems: visibleCustomers,
    hasMore: hasMoreCustomers,
    loadMore: loadMoreCustomers,
    loadMoreRef: customersLoadMoreRef,
    remainingCount: customersRemaining,
    totalCount: customersTotalCount,
  } = useProgressiveList(filteredCustomers, 15, 15);

  // Filtered udhar for the "All Udhar" section
  const filteredUdharList = useMemo(() => {
    let filtered = [...udharList];

    if (udharStatusFilter === "pending") {
      filtered = filtered.filter(u => {
        const total = u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0);
        const paid = u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0);
        return paid < total;
      });
    } else if (udharStatusFilter === "paid") {
      filtered = filtered.filter(u => {
        const total = u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0);
        const paid = u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0);
        return paid >= total;
      });
    }

    if (udharCustomerFilter !== "all") {
      filtered = filtered.filter(u => u.customerId === udharCustomerFilter);
    }

    // Sort based on selected option
    if (udharAmountSort === "highest") {
      return filtered.sort((a, b) => {
        const totalA = a.amount || (a.cashAmount || 0) + (a.onlineAmount || 0);
        const totalB = b.amount || (b.cashAmount || 0) + (b.onlineAmount || 0);
        return totalB - totalA;
      });
    } else if (udharAmountSort === "lowest") {
      return filtered.sort((a, b) => {
        const totalA = a.amount || (a.cashAmount || 0) + (a.onlineAmount || 0);
        const totalB = b.amount || (b.cashAmount || 0) + (b.onlineAmount || 0);
        return totalA - totalB;
      });
    } else if (udharAmountSort === "oldest") {
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
  }, [udharList, udharStatusFilter, udharCustomerFilter, udharAmountSort]);

  // Collect all receipts/bills from udhar for the "All Receipts" view
  const allReceipts = useMemo(() => {
    const receipts = [];
    udharList.forEach(udhar => {
      const customerName = customers.find(c => c.id === udhar.customerId)?.name || "Unknown";
      const totalAmount = udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);

      // Add khata/bill photos
      if (udhar.khataPhotos?.length > 0) {
        udhar.khataPhotos.forEach(photo => {
          receipts.push({
            url: photo,
            type: "khata",
            date: udhar.date,
            customerName,
            amount: totalAmount,
          });
        });
      }
      if (udhar.billImages?.length > 0) {
        udhar.billImages.forEach(photo => {
          receipts.push({
            url: photo,
            type: "khata",
            date: udhar.date,
            customerName,
            amount: totalAmount,
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
              customerName,
              amount: payment.amount,
            });
          }
        });
      }
    });
    // Sort by date, newest first
    return receipts.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [udharList, customers]);

  // Count filtered receipts for the section badge
  const allUdharReceiptsCount = useMemo(() => {
    let count = 0;
    filteredUdharList.forEach(u => {
      count += (u.khataPhotos?.length || 0) + (u.billImages?.length || 0);
      if (u.payments) {
        u.payments.forEach(p => {
          if (p.receiptUrl) count++;
        });
      }
    });
    return count;
  }, [filteredUdharList]);

  // Quick add udhar for a customer
  const handleQuickAdd = async () => {
    if (!quickAddAmount || Number(quickAddAmount) <= 0) {
      haptics.error();
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
        haptics.success();
        toast.success(`₹${Number(quickAddAmount).toLocaleString()} added for ${quickAddCustomer.name}`);
        setQuickAddOpen(false);
        setQuickAddAmount("");
        setQuickAddBillImages([]);
        setQuickAddNotes("");
        setQuickAddCustomer(null);
        // Keep the collapsible open for the customer
        setExpandedCustomerId(customerId);
      } else {
        haptics.error();
        toast.error("Failed to add Udhar");
      }
    } finally {
      setIsSubmittingQuickAdd(false);
    }
  };

  // Handle quick add bill image upload
  const handleQuickAddBillSelect = async e => {
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
      setQuickAddBillImages(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error("Error uploading bill images:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploadingQuickAddBill(false);
      e.target.value = "";
    }
  };

  // Handle new customer with initial amount
  const handleAddCustomerWithAmount = async customerData => {
    const result = await addCustomer(customerData);

    if (result.success && initialAmount && Number(initialAmount) > 0) {
      // Add initial udhar transaction with khata photos if any
      await addUdhar({
        customerId: result.data.id,
        amount: Number(initialAmount),
        date: new Date().toISOString().split("T")[0],
        notes: "First Udhar amount",
        khataPhotos: customerData.khataPhotos || [],
      });
      toast.success("Customer added with initial Udhar");
    } else if (result.success) {
      toast.success("Customer added");
    }

    setNewCustomerWithAmount(false);
    setInitialAmount("");
    return result;
  };

  const getCustomerInitials = name => {
    return (
      name
        ?.split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  // Helper to format relative date
  const formatRelativeDate = dateString => {
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
      .filter(u => u.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedCustomer, udharList]);

  // Get all khata photos for selected customer with transaction reference
  const selectedCustomerKhataPhotos = useMemo(() => {
    if (!selectedCustomer) return [];
    const photos = [];
    selectedCustomerTransactions.forEach(txn => {
      if (txn.khataPhotos && Array.isArray(txn.khataPhotos)) {
        txn.khataPhotos.forEach((photo, index) => {
          if (photo && typeof photo === "string") {
            photos.push({
              url: photo,
              udharId: txn.id,
              photoIndex: index,
              date: txn.date,
              amount: txn.amount || (txn.cashAmount || 0) + (txn.onlineAmount || 0),
            });
          }
        });
      }
    });
    return photos;
  }, [selectedCustomer, selectedCustomerTransactions]);

  // Handle deleting a khata photo
  const handleDeleteKhataPhoto = async photo => {
    if (!isOnline) {
      toast.error("Cannot delete while offline");
      return;
    }

    const udhar = udharList.find(u => u.id === photo.udharId);
    if (!udhar) {
      toast.error("Transaction not found");
      return;
    }

    // Remove the photo from the khataPhotos array
    const updatedPhotos = [...(udhar.khataPhotos || [])];
    updatedPhotos.splice(photo.photoIndex, 1);

    const result = await updateUdhar(photo.udharId, {
      khataPhotos: updatedPhotos,
    });

    if (result.success) {
      toast.success("Photo deleted");
    } else {
      toast.error("Failed to delete photo");
    }
    setDeletingPhotoIndex(null);
  };

  // Handle customer edit
  const handleEditCustomer = async data => {
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
  const handleOpenPayment = txn => {
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

    const setUploading = isQuickCollect ? setIsUploadingQuickReceipt : setIsUploadingReceipt;
    const setReceipts = isQuickCollect ? setQuickCollectReceipts : setPaymentReceipts;
    const currentReceipts = isQuickCollect ? quickCollectReceipts : paymentReceipts;

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
        reader.onload = e => {
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
      setQuickCollectReceipts(prev => prev.filter((_, i) => i !== index));
    } else {
      setPaymentReceipts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentUdhar || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    // Calculate pending amount
    const totalAmount =
      paymentUdhar.amount ||
      (paymentUdhar.cashAmount || 0) + (paymentUdhar.onlineAmount || 0);
    const paidAmount =
      paymentUdhar.paidAmount ||
      (paymentUdhar.paidCash || 0) + (paymentUdhar.paidOnline || 0);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);
    const paymentValue = Number(paymentAmount);
    
    // Validate that payment amount doesn't exceed pending amount
    if (paymentValue > pendingAmount) {
      haptics.error();
      toast.error(`Cannot collect more than pending amount of ₹${pendingAmount.toLocaleString()}`);
      return;
    }

    setIsSubmittingPayment(true);
    try {
      // Use first receipt or null
      const receiptUrl = paymentReceipts.length > 0 ? paymentReceipts[0] : null;

      const result = await recordDeposit(paymentUdhar.id, Number(paymentAmount), receiptUrl);

      if (result.success) {
        toast.success(`₹${Number(paymentAmount).toLocaleString()} payment recorded`);
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
  const handleQuickCollect = customer => {
    setQuickCollectCustomer(customer);
    setQuickCollectAmount(customer.pendingAmount.toString());
    setQuickCollectReceipts([]);
    setQuickCollectNotes("");
    setQuickCollectOpen(true);
  };

  const handleQuickCollectSubmit = async () => {
    if (!quickCollectCustomer || !quickCollectAmount || Number(quickCollectAmount) <= 0) {
      haptics.error();
      toast.error("Please enter a valid amount");
      return;
    }
    
    // Validate that collect amount doesn't exceed pending amount
    const collectAmount = Number(quickCollectAmount);
    const pendingAmount = quickCollectCustomer.pendingAmount || 0;
    
    if (collectAmount > pendingAmount) {
      haptics.error();
      toast.error(`Cannot collect more than pending amount of ₹${pendingAmount.toLocaleString()}`);
      return;
    }

    setIsSubmittingQuickCollect(true);
    try {
      // Get the oldest pending udhar for this customer
      const customerUdhars = udharList
        .filter(u => u.customerId === quickCollectCustomer.id && u.paymentStatus !== "paid")
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (customerUdhars.length === 0) {
        haptics.error();
        toast.error("No pending Udhar found");
        return;
      }

      let remainingAmount = Number(quickCollectAmount);
      let isFirstPayment = true;

      // Use first receipt or null
      const receiptUrl = quickCollectReceipts.length > 0 ? quickCollectReceipts[0] : null;

      // Apply payment to oldest udhar entries first
      for (const udhar of customerUdhars) {
        if (remainingAmount <= 0) break;

        const total = udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
        const paid = udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
        const pending = Math.max(0, total - paid);

        if (pending <= 0) continue;

        const paymentForThis = Math.min(remainingAmount, pending);
        // Only attach receipt and notes to the first payment
        const result = await recordDeposit(
          udhar.id,
          paymentForThis,
          isFirstPayment ? receiptUrl : null,
          isFirstPayment ? quickCollectNotes : null
        );

        if (!result.success) {
          haptics.error();
          toast.error(result.error || "Failed to record payment");
          return;
        }

        remainingAmount -= paymentForThis;
        isFirstPayment = false;
      }

      const customerId = quickCollectCustomer.id;
      haptics.success();
      toast.success(`₹${Number(quickCollectAmount).toLocaleString()} collected from ${quickCollectCustomer.name}`);
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
  const getFullCustomerData = customerId => {
    return customersWithStats.find(c => c.id === customerId);
  };

  const loading = customersLoading || udharLoading;

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalUdhar = customersWithStats.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalCollected = customersWithStats.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalPending = customersWithStats.reduce((sum, c) => sum + c.pendingAmount, 0);
    const pendingCount = customersWithStats.filter(c => c.pendingAmount > 0 && c.paidAmount === 0).length;
    const partialCount = customersWithStats.filter(c => c.pendingAmount > 0 && c.paidAmount > 0).length;
    const paidCount = customersWithStats.filter(c => c.pendingAmount === 0 && c.totalAmount > 0).length;
    const highAmountCount = customersWithStats.filter(c => c.pendingAmount >= 5000).length;
    return { totalUdhar, totalCollected, totalPending, pendingCount, partialCount, paidCount, highAmountCount };
  }, [customersWithStats]);

  // Handle filter chip click with haptic feedback
  const handleFilterChange = (filter) => {
    haptics.light();
    setActiveFilter(filter);
    setSortOrder("smart"); // Reset to smart sorting when filter changes
  };

  // Handle sort order change with haptic feedback
  const handleSortChange = (order) => {
    haptics.light();
    setSortOrder(order);
  };

  return (
    <div className="space-y-3 p-4 lg:p-6">
      {/* Header - Simplified */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Customers</h1>
        <Button
          size="sm"
          onClick={() => {
            if (!isOnline) {
              toast.error("Cannot add while offline");
              return;
            }
            haptics.light();
            setNewCustomerWithAmount(true);
            setCustomerFormOpen(true);
          }}
          disabled={!isOnline}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add New Customer
        </Button>
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
                <p>Collected: <span className="font-medium text-green-600">₹{summaryStats.totalCollected.toLocaleString()}</span></p>
                <p>Total: ₹{summaryStats.totalUdhar.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search - Context-aware placeholder */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, phone, or amount..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
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
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            size="sm"
            className="h-8 shrink-0 rounded-full px-3 text-xs"
            onClick={() => handleFilterChange("all")}
          >
            All ({customers.length})
          </Button>
          
          {/* Sorting Chips - After All */}
          <div className="mx-1 h-8 w-px shrink-0 bg-border" />
          <Button
            variant={sortOrder === "newest" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs",
              sortOrder !== "newest" && "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
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
              sortOrder !== "oldest" && "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
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
              sortOrder !== "highest" && "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
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
              sortOrder !== "lowest" && "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
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
              activeFilter !== "pending" && "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
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
              activeFilter !== "partial" && "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
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
              activeFilter !== "paid" && "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
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
                activeFilter !== "high" && "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              )}
              onClick={() => handleFilterChange("high")}
            >
              High ₹5k+ ({summaryStats.highAmountCount})
            </Button>
          )}
        </div>
      </div>

      {/* Customer Profiles Section - Collapsible */}
      <Collapsible open={customersExpanded} onOpenChange={setCustomersExpanded}>
        <CollapsibleTrigger asChild>
          <button className="sticky top-14 z-20 -mx-4 flex w-[calc(100%+2rem)] items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur transition-colors hover:bg-muted/50 supports-[backdrop-filter]:bg-background/80 lg:top-[57px]">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-orange-500" />
              <span className="font-semibold">Customer Profiles</span>
              <Badge 
                key={`${filteredCustomers.length}-${activeFilter}-${sortOrder}`}
                variant="secondary" 
                className="text-xs animate-pop-in"
              >
                {filteredCustomers.length}
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
                customersExpanded && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Customer List */}
          {loading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3, 4, 5].map(i => (
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
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              {searchQuery ? (
                <>
                  <p className="font-medium">No customer matches &quot;{searchQuery}&quot;</p>
                  <p className="mt-1 text-sm text-muted-foreground">Try a different name, phone, or amount</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearchQuery("")}>
                    Clear search
                  </Button>
                </>
              ) : activeFilter !== "all" ? (
                <>
                  <p className="font-medium">
                    {activeFilter === "pending" && "No pending customers"}
                    {activeFilter === "partial" && "No partially paid customers"}
                    {activeFilter === "paid" && "No fully paid customers"}
                    {activeFilter === "high" && "No high-value pending (₹5k+)"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeFilter === "paid" ? "Collect payments to see them here" : "You're all caught up! 🎉"}
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveFilter("all")}>
                    Show all customers
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium">No customers yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Add your first customer to start tracking</p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setNewCustomerWithAmount(true);
                      setCustomerFormOpen(true);
                    }}
                    disabled={!isOnline}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Customer
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {visibleCustomers.map(customer => {
                const isExpanded = expandedCustomerId === customer.id;

                // Get last transaction for this customer
                const customerUdhars = udharList
                  .filter(u => u.customerId === customer.id)
                  .sort((a, b) => new Date(b.date) - new Date(a.date));
                const lastTxn = customerUdhars[0];
                const lastTxnAmount = lastTxn ? (lastTxn.amount || (lastTxn.cashAmount || 0) + (lastTxn.onlineAmount || 0)) : 0;

                // Get all payments for this customer from all udhar transactions
                const customerPayments = isExpanded
                  ? udharList
                      .filter(u => u.customerId === customer.id)
                      .flatMap(u =>
                        (u.payments || []).map(p => ({
                          ...p,
                          udharId: u.id,
                          udharAmount: u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0),
                        }))
                      )
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                  : [];

                // Get all khata photos for this customer (from udhar transactions) with metadata
                const customerKhataPhotos = isExpanded
                  ? udharList
                      .filter(u => u.customerId === customer.id)
                      .flatMap(u => {
                        const photos = u.khataPhotos || u.billImages || [];
                        return photos.map(photo => ({
                          url: photo,
                          amount: u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0),
                          date: u.date,
                          customerName: customer.name,
                          type: "khata",
                        }));
                      })
                  : [];

                // Determine payment status
                const isPaid = customer.pendingAmount === 0 && customer.totalAmount > 0;
                const isPartial = customer.pendingAmount > 0 && customer.paidAmount > 0;
                const isPending = customer.pendingAmount > 0 && customer.paidAmount === 0;

                return (
                  <Card
                    key={customer.id}
                    className={cn(
                      "overflow-hidden transition-all",
                      isPending
                        ? "border-l-4 border-l-amber-500"
                        : isPartial
                          ? "border-l-4 border-l-blue-500"
                          : isPaid
                            ? "border-l-4 border-l-green-500"
                            : "border-l-4 border-l-muted",
                      isExpanded && "shadow-md ring-2 ring-primary/20"
                    )}
                  >
                    <CardContent className="p-0">
                      {/* Main Row - tap to expand/collapse */}
                      <div
                        className={cn(
                          "cursor-pointer p-3 transition-all active:scale-[0.99]",
                          isExpanded ? "bg-primary/5" : "hover:bg-muted/30"
                        )}
                        onClick={() => {
                          haptics.light();
                          setExpandedCustomerId(isExpanded ? null : customer.id);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar - smaller, tap to open details */}
                          <Avatar
                            className="h-10 w-10 shrink-0 cursor-pointer"
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedCustomer(customer);
                            }}
                          >
                            <AvatarImage src={customer.profilePicture} />
                            <AvatarFallback className="bg-muted text-sm font-medium text-muted-foreground">
                              {getCustomerInitials(customer.name)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Info - Hierarchy: Name → Pending → Status → Last Txn */}
                          <div className="min-w-0 flex-1">
                            {/* Row 1: Name + Status Badge */}
                            <div className="flex items-center gap-2">
                              <p className="truncate font-semibold">{customer.name}</p>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "shrink-0 text-[10px] px-1.5 py-0",
                                  isPending && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                  isPartial && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                  isPaid && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                )}
                              >
                                                                {isPending ? "Total Pending" : isPartial ? "Partially Paid" : isPaid ? "Fully Paid" : "No Udhar"}

                              </Badge>
                            </div>

                            {/* Row 2: Pending Amount (HERO) */}
                            {customer.pendingAmount > 0 && (
                              <p className="mt-0.5 text-lg font-bold text-amber-600 dark:text-amber-400">
                                ₹{customer.pendingAmount.toLocaleString()}
                              </p>
                            )}

                            {/* Row 3: Last transaction info */}
                            {lastTxn && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Latest Udhar of: ₹{lastTxnAmount.toLocaleString()} · {formatRelativeDate(lastTxn.date)}
                                {customer.transactionCount > 1 && ` · ${customer.transactionCount} txns`}
                              </p>
                            )}
                          </div>

                          {/* Chevron */}
                          <ChevronDown
                            className={cn(
                              "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </div>
                      </div>

                      {/* Collapsible Section with Progress, Payment History & Actions */}
                      {isExpanded && (
                        <div className="border-t bg-primary/5 px-3 pb-3 pt-0">
                          {/* Remaining Amount - Prominent on top */}
                          {customer.pendingAmount > 0 && (
                            <div className="pb-2 pt-3">
                              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-800 dark:bg-amber-950/30">
                                <p className="mb-1 text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                  Remaining Balance
                                </p>
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                  ₹{customer.pendingAmount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Payment Progress Bar - only show if there's any transaction */}
                          {customer.totalAmount > 0 && (
                            <div className="pb-2 pt-2">
                              <div className="mb-1.5 flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Total: ₹{customer.totalAmount.toLocaleString()}
                                </span>
                                <span className="text-green-600">
                                  Paid: ₹{customer.paidAmount.toLocaleString()}
                                </span>
                              </div>
                              {/* Progress bar */}
                              <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    customer.pendingAmount === 0
                                      ? "bg-green-500"
                                      : "bg-gradient-to-r from-green-500 to-green-400"
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
                            <div className="pb-2 pt-2">
                              <p className="mb-2 text-xs font-medium text-muted-foreground">
                                Received Payments History
                              </p>
                              <div className="max-h-[150px] space-y-0 overflow-y-auto">
                                {customerPayments.slice(0, 5).map((payment, index, arr) => (
                                  <div key={payment.id} className="flex">
                                    {/* Timeline line and dot */}
                                    <div className="mr-3 flex flex-col items-center">
                                      <div
                                        className={cn(
                                          "flex h-3 w-3 items-center justify-center rounded-full",
                                          index === 0 ? "bg-green-500" : "bg-green-400"
                                        )}
                                      >
                                        <CheckCircle2 className="h-2 w-2 text-white" />
                                      </div>
                                      {index < arr.length - 1 && (
                                        <div className="h-full min-h-[20px] w-0.5 bg-green-300" />
                                      )}
                                    </div>

                                    {/* Payment details */}
                                    <div className="flex-1 pb-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-green-600">
                                          ₹{payment.amount.toLocaleString()}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          — {formatRelativeDate(payment.date)}
                                        </span>
                                        {payment.receiptUrl && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 gap-1 px-2 text-xs"
                                            onClick={e => {
                                              e.stopPropagation();
                                              setImageViewerSrc(payment.receiptUrl);
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
                                          onClick={e => {
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
                                        <p className="mt-0.5 text-xs italic text-muted-foreground">
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
                                  <p className="pl-6 text-xs text-muted-foreground">
                                    +{customerPayments.length - 5} more payments
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Khata Photos */}
                          {customerKhataPhotos.length > 0 && (
                            <div className="pb-2 pt-2">
                              <p className="mb-2 text-xs font-medium text-muted-foreground">
                                Khata Photos ({customerKhataPhotos.length})
                              </p>
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {customerKhataPhotos.slice(0, 6).map((photo, idx) => (
                                  <div
                                    key={idx}
                                    className="h-16 w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-muted"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setGalleryImages(customerKhataPhotos);
                                      setGalleryInitialIndex(idx);
                                      setGalleryViewerOpen(true);
                                    }}
                                  >
                                    <img
                                      src={photo.url}
                                      alt={`Khata ${idx + 1}`}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                ))}
                                {customerKhataPhotos.length > 6 && (
                                  <div
                                    className="flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg bg-muted"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setGalleryImages(customerKhataPhotos);
                                      setGalleryInitialIndex(0);
                                      setGalleryViewerOpen(true);
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
                              className="h-10 flex-1 gap-2 text-sm"
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
                                className="h-10 flex-1 gap-2 border-green-200 bg-green-50 text-sm text-green-700 hover:bg-green-100"
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
                              className="h-10 flex-1 gap-2 border-amber-200 bg-amber-50 text-sm text-amber-700 hover:bg-amber-100"
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
                totalCount={customersTotalCount}
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* All Udhar & Receipts Section - Collapsible */}
      <Collapsible open={udharExpanded} onOpenChange={setUdharExpanded}>
        <CollapsibleTrigger asChild>
          <button className="sticky top-[57px] z-20 -mx-4 flex w-[calc(100%+2rem)] items-center justify-between rounded-lg border border-amber-200 bg-background/95 px-5 py-3 backdrop-blur transition-colors hover:bg-muted/50 supports-[backdrop-filter]:bg-background/80 lg:top-[105px]">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">All Transactions</span>
              <Badge variant="secondary" className="text-xs">
                {udharList.length}
              </Badge>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                udharExpanded && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 py-3">
            {/* Filter Chips - One-tap toggles - Sticky when expanded */}
            <div className="sticky top-[102px] z-10 -mx-4 flex gap-2 overflow-x-auto border-b bg-background/95 px-5 py-4 backdrop-blur scrollbar-none supports-[backdrop-filter]:bg-background/80 lg:top-[153px]">
              <Button
                variant={udharStatusFilter === "all" ? "default" : "outline"}
                size="sm"
                className="h-8 shrink-0 rounded-full px-3 text-xs"
                onClick={() => {
                  haptics.light();
                  setUdharStatusFilter("all");
                  setUdharAmountSort("newest");
                }}
              >
                All ({udharList.length})
              </Button>
              
              {/* Sorting Chips */}
              <div className="mx-1 h-8 w-px shrink-0 bg-border" />
              <Button
                variant={udharAmountSort === "newest" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  udharAmountSort !== "newest" && "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
                )}
                onClick={() => {
                  haptics.light();
                  setUdharAmountSort("newest");
                }}
              >
                <ArrowDown className="mr-1 h-3 w-3" />
                Newest
              </Button>
              <Button
                variant={udharAmountSort === "oldest" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  udharAmountSort !== "oldest" && "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
                )}
                onClick={() => {
                  haptics.light();
                  setUdharAmountSort("oldest");
                }}
              >
                <ArrowUp className="mr-1 h-3 w-3" />
                Oldest
              </Button>
              <Button
                variant={udharAmountSort === "highest" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  udharAmountSort !== "highest" && "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                )}
                onClick={() => {
                  haptics.light();
                  setUdharAmountSort("highest");
                }}
              >
                <TrendingUp className="mr-1 h-3 w-3" />
                Max ₹
              </Button>
              <Button
                variant={udharAmountSort === "lowest" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  udharAmountSort !== "lowest" && "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                )}
                onClick={() => {
                  haptics.light();
                  setUdharAmountSort("lowest");
                }}
              >
                <TrendingDown className="mr-1 h-3 w-3" />
                Min ₹
              </Button>
              <div className="mx-1 h-8 w-px shrink-0 bg-border" />

              <Button
                variant={udharStatusFilter === "pending" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  udharStatusFilter !== "pending" && "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
                )}
                onClick={() => {
                  haptics.light();
                  setUdharStatusFilter("pending");
                }}
              >
                <Clock className="mr-1 h-3 w-3" />
                Pending
              </Button>
              <Button
                variant={udharStatusFilter === "paid" ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 text-xs",
                  udharStatusFilter !== "paid" && "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                )}
                onClick={() => {
                  haptics.light();
                  setUdharStatusFilter("paid");
                }}
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                All Paid Up
              </Button>
              {/* Customer filter as autocomplete */}
              <Autocomplete
                options={[{ id: "all", name: "All Customers" }, ...customers]}
                value={udharCustomerFilter}
                onValueChange={(val) => {
                  haptics.light();
                  setUdharCustomerFilter(val || "all");
                }}
                placeholder="All Customers"
                searchPlaceholder="Search customer..."
                emptyText="No customer found"
                className="w-[160px] shrink-0"
                triggerClassName="h-8 rounded-full border-dashed px-3 text-xs"
                getOptionLabel={(opt) => opt?.name || ""}
                getOptionValue={(opt) => opt?.id || ""}
              />
            </div>

            {/* Stats + Receipts Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  key={`${filteredUdharList.length}-${udharStatusFilter}-${udharAmountSort}`}
                  variant="secondary" 
                  className="text-xs animate-pop-in"
                >
                  {filteredUdharList.length} transaction{filteredUdharList.length !== 1 ? "s" : ""}
                </Badge>
                {(udharStatusFilter !== "all" || udharAmountSort !== "newest") && (
                  <Badge variant="outline" className="text-xs text-muted-foreground animate-pop-in">
                    {udharStatusFilter !== "all" && udharStatusFilter}
                    {udharStatusFilter !== "all" && udharAmountSort !== "newest" && " · "}
                    {udharAmountSort !== "newest" && udharAmountSort}
                  </Badge>
                )}
              </div>
              {allReceipts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setAllReceiptsSheetOpen(true)}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Receipts ({allReceipts.length})
                </Button>
              )}
            </div>

            {/* Udhar List */}
            <UdharList
              udharList={filteredUdharList}
              customers={customers}
              onEdit={udhar => {
                if (!isOnline) {
                  toast.error("Cannot edit while offline");
                  return;
                }
                setUdharToEdit(udhar);
                setUdharFormOpen(true);
              }}
              onDelete={async udhar => {
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
              }}
              onDeposit={async (id, amount, receiptUrl) => {
                if (!isOnline) {
                  toast.error("Cannot record deposit while offline");
                  return;
                }
                await recordDeposit(id, amount, receiptUrl);
              }}
              onFullPaid={async id => {
                if (!isOnline) {
                  toast.error("Cannot mark as paid while offline");
                  return;
                }
                await markFullPaid(id);
              }}
              onDeletePayment={deletePayment}
              loading={udharLoading}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Customer Form - Only show when NOT editing */}
      {!editingCustomer && (
        <CustomerForm
          open={customerFormOpen}
          onOpenChange={open => {
            setCustomerFormOpen(open);
            if (!open) {
              setNewCustomerWithAmount(false);
              setInitialAmount("");
            }
          }}
          onSubmit={newCustomerWithAmount ? handleAddCustomerWithAmount : addCustomer}
          title={newCustomerWithAmount ? "Add Customer with Udhar" : "Add Customer"}
          showInitialAmount={newCustomerWithAmount}
          initialAmount={initialAmount}
          onInitialAmountChange={setInitialAmount}
        />
      )}

      {/* Udhar Form */}
      <UdharForm
        open={udharFormOpen}
        onOpenChange={open => {
          setUdharFormOpen(open);
          if (!open) {
            setUdharToEdit(null);
          }
        }}
        onSubmit={
          udharToEdit
            ? async data => {
                const result = await updateUdhar(udharToEdit.id, data);
                if (result.success) {
                  toast.success("Udhar updated");
                  setUdharToEdit(null);
                } else {
                  toast.error("Failed to update");
                }
                return result;
              }
            : addUdhar
        }
        onAddCustomer={addCustomer}
        customers={customers}
        defaultCustomerId={selectedCustomerId}
        initialData={udharToEdit}
        title={udharToEdit ? "Edit Udhar" : "Add Udhar"}
      />

      {/* Quick Add Udhar Sheet - slides from top */}
      <Sheet open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <SheetContent side="top" className="flex flex-col rounded-b-2xl p-0" hideClose>
          {/* Header with action buttons */}
          <SheetHeader className="border-b px-4 py-3">
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
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <SheetTitle className="flex-1 text-center text-base font-semibold">
                Add Udhar
              </SheetTitle>
              <Button
                size="sm"
                onClick={handleQuickAdd}
                disabled={
                  !isOnline ||
                  !quickAddAmount ||
                  Number(quickAddAmount) <= 0 ||
                  isSubmittingQuickAdd
                }
                className="h-9 px-3"
              >
                {isSubmittingQuickAdd ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {quickAddCustomer && (
                <p className="text-center text-sm text-muted-foreground">
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
                  onChange={e => setQuickAddAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="h-16 text-center text-3xl font-bold"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  value={quickAddNotes}
                  onChange={e => setQuickAddNotes(e.target.value)}
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
                    <Camera className="mr-2 h-4 w-4" />
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
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Gallery
                  </Button>
                </div>
                {isUploadingQuickAddBill && (
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                )}
                {quickAddBillImages.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {quickAddBillImages.map((url, idx) => (
                      <div key={idx} className="relative aspect-square">
                        <img
                          src={url}
                          alt={`Bill ${idx + 1}`}
                          className="h-full w-full rounded-lg object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                          onClick={() =>
                            setQuickAddBillImages(prev => prev.filter((_, i) => i !== idx))
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
          <div className="flex justify-center pb-3 pt-2" data-drag-handle>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Quick Collect Sheet - slides from top */}
      <Sheet open={quickCollectOpen} onOpenChange={setQuickCollectOpen}>
        <SheetContent side="top" className="flex max-h-[80vh] flex-col rounded-b-2xl p-0" hideClose>
          {/* Header with action buttons */}
          <SheetHeader className="border-b px-4 py-3">
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
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <SheetTitle className="flex-1 text-center text-base font-semibold">
                Collect Payment
              </SheetTitle>
              <Button
                size="sm"
                onClick={handleQuickCollectSubmit}
                disabled={
                  !isOnline ||
                  !quickCollectAmount ||
                  Number(quickCollectAmount) <= 0 ||
                  Number(quickCollectAmount) > (quickCollectCustomer?.pendingAmount || 0) ||
                  isSubmittingQuickCollect
                }
                className="h-9 bg-green-600 px-3 hover:bg-green-700"
              >
                {isSubmittingQuickCollect ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Collect
                  </>
                )}
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {quickCollectCustomer && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Collecting from <strong>{quickCollectCustomer.name}</strong>
                    </span>
                    <span className="text-lg font-bold text-amber-600">
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
                  onChange={e => {
                    const value = e.target.value;
                    setQuickCollectAmount(value);
                    
                    // Real-time validation feedback
                    if (value && quickCollectCustomer) {
                      const amount = parseFloat(value);
                      const pendingAmount = quickCollectCustomer.pendingAmount || 0;
                      
                      if (!isNaN(amount) && amount > pendingAmount) {
                        e.target.classList.add("border-destructive");
                      } else {
                        e.target.classList.remove("border-destructive");
                      }
                    }
                  }}
                  max={quickCollectCustomer?.pendingAmount || undefined}
                  placeholder="Enter amount"
                  className="h-16 text-center text-3xl font-bold"
                />
                {quickCollectCustomer && quickCollectAmount && (() => {
                  const amount = parseFloat(quickCollectAmount);
                  const pendingAmount = quickCollectCustomer.pendingAmount || 0;
                  if (!isNaN(amount) && amount > pendingAmount) {
                    return (
                      <p className="text-xs text-destructive mt-1">
                        Cannot exceed pending amount of ₹{pendingAmount.toLocaleString()}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  value={quickCollectNotes}
                  onChange={e => setQuickCollectNotes(e.target.value)}
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
                  onChange={e => handleReceiptSelect(e, true)}
                  className="hidden"
                />
                <input
                  ref={quickReceiptGalleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => handleReceiptSelect(e, true)}
                  className="hidden"
                />

                {/* Show uploaded receipts */}
                {quickCollectReceipts.length > 0 && (
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    {quickCollectReceipts.map((receipt, index) => (
                      <div
                        key={index}
                        className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                      >
                        <img
                          src={receipt}
                          alt={`Receipt ${index + 1}`}
                          className="h-full w-full cursor-pointer object-cover"
                          onClick={() => {
                            setImageViewerSrc(receipt);
                            setImageViewerOpen(true);
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute right-1 top-1 h-6 w-6"
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
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => quickReceiptInputRef.current?.click()}
                    className="h-10 flex-1 gap-1.5"
                    disabled={isUploadingQuickReceipt}
                  >
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => quickReceiptGalleryInputRef.current?.click()}
                    className="h-10 flex-1 gap-1.5"
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
          <div className="flex justify-center pb-3 pt-2" data-drag-handle>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Sheet - slides from top */}
      <Sheet open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <SheetContent side="top" className="flex max-h-[80vh] flex-col rounded-b-2xl p-0" hideClose>
          {/* Header with action buttons */}
          <SheetHeader className="border-b px-4 py-3">
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
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <SheetTitle className="flex-1 text-center text-base font-semibold">
                Record Payment
              </SheetTitle>
              <Button
                size="sm"
                onClick={handleRecordPayment}
                disabled={(() => {
                  if (!isOnline || !paymentAmount || isSubmittingPayment) return true;
                  const amount = Number(paymentAmount);
                  if (isNaN(amount) || amount <= 0) return true;
                  if (!paymentUdhar) return true;
                  const totalAmount =
                    paymentUdhar.amount ||
                    (paymentUdhar.cashAmount || 0) + (paymentUdhar.onlineAmount || 0);
                  const paidAmount =
                    paymentUdhar.paidAmount ||
                    (paymentUdhar.paidCash || 0) + (paymentUdhar.paidOnline || 0);
                  const pendingAmount = Math.max(0, totalAmount - paidAmount);
                  return amount > pendingAmount;
                })()}
                className="h-9 bg-green-600 px-3 hover:bg-green-700"
              >
                {isSubmittingPayment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" />
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
                    (paymentUdhar.cashAmount || 0) + (paymentUdhar.onlineAmount || 0);
                  const paidAmount =
                    paymentUdhar.paidAmount ||
                    (paymentUdhar.paidCash || 0) + (paymentUdhar.paidOnline || 0);
                  const pendingAmount = Math.max(0, totalAmount - paidAmount);

                  return (
                    <div className="space-y-3 rounded-xl bg-muted/50 p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Amount</span>
                        <span className="text-lg font-bold">₹{totalAmount.toLocaleString()}</span>
                      </div>
                      {paidAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Already Paid</span>
                          <span className="font-medium text-green-600">
                            ₹{paidAmount.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-3 text-sm">
                        <span className="font-medium text-amber-600">Pending</span>
                        <span className="text-lg font-bold text-amber-600">
                          ₹{pendingAmount.toLocaleString()}
                        </span>
                      </div>
                      {paymentUdhar.notes && (
                        <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                          <span>Notes</span>
                          <span className="max-w-[150px] truncate">{paymentUdhar.notes}</span>
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
                  onChange={e => {
                    const value = e.target.value;
                    setPaymentAmount(value);
                    
                    // Real-time validation feedback
                    if (value && paymentUdhar) {
                      const amount = parseFloat(value);
                      const totalAmount =
                        paymentUdhar.amount ||
                        (paymentUdhar.cashAmount || 0) + (paymentUdhar.onlineAmount || 0);
                      const paidAmount =
                        paymentUdhar.paidAmount ||
                        (paymentUdhar.paidCash || 0) + (paymentUdhar.paidOnline || 0);
                      const pendingAmount = Math.max(0, totalAmount - paidAmount);
                      
                      if (!isNaN(amount) && amount > pendingAmount) {
                        e.target.classList.add("border-destructive");
                      } else {
                        e.target.classList.remove("border-destructive");
                      }
                    }
                  }}
                  max={paymentUdhar ? (() => {
                    const totalAmount =
                      paymentUdhar.amount ||
                      (paymentUdhar.cashAmount || 0) + (paymentUdhar.onlineAmount || 0);
                    const paidAmount =
                      paymentUdhar.paidAmount ||
                      (paymentUdhar.paidCash || 0) + (paymentUdhar.paidOnline || 0);
                    return Math.max(0, totalAmount - paidAmount);
                  })() : undefined}
                  placeholder="Enter amount"
                  className="h-16 text-center text-3xl font-bold"
                />
                {paymentUdhar && paymentAmount && (() => {
                  const amount = parseFloat(paymentAmount);
                  const totalAmount =
                    paymentUdhar.amount ||
                    (paymentUdhar.cashAmount || 0) + (paymentUdhar.onlineAmount || 0);
                  const paidAmount =
                    paymentUdhar.paidAmount ||
                    (paymentUdhar.paidCash || 0) + (paymentUdhar.paidOnline || 0);
                  const pendingAmount = Math.max(0, totalAmount - paidAmount);
                  if (!isNaN(amount) && amount > pendingAmount) {
                    return (
                      <p className="text-xs text-destructive mt-1">
                        Cannot exceed pending amount of ₹{pendingAmount.toLocaleString()}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Payment Receipts Upload - Multiple */}
              <div className="space-y-2">
                <Label className="text-sm">Payment Receipts (Optional)</Label>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={e => handleReceiptSelect(e, false)}
                  className="hidden"
                />
                <input
                  ref={receiptGalleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => handleReceiptSelect(e, false)}
                  className="hidden"
                />

                {/* Show uploaded receipts */}
                {paymentReceipts.length > 0 && (
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    {paymentReceipts.map((receipt, index) => (
                      <div
                        key={index}
                        className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                      >
                        <img
                          src={receipt}
                          alt={`Receipt ${index + 1}`}
                          className="h-full w-full cursor-pointer object-cover"
                          onClick={() => {
                            setImageViewerSrc(receipt);
                            setImageViewerOpen(true);
                          }}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute right-1 top-1 h-6 w-6"
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
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => receiptInputRef.current?.click()}
                    className="h-10 flex-1 gap-1.5"
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
                    className="h-10 flex-1 gap-1.5"
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
                    (paymentUdhar.cashAmount || 0) + (paymentUdhar.onlineAmount || 0);
                  const paidAmount =
                    paymentUdhar.paidAmount ||
                    (paymentUdhar.paidCash || 0) + (paymentUdhar.paidOnline || 0);
                  const pendingAmount = totalAmount - paidAmount;

                  return pendingAmount > 0 ? (
                    <Button
                      variant="outline"
                      onClick={handleMarkFullPaidFromDialog}
                      className="h-12 w-full border-green-200 text-green-600 hover:bg-green-50"
                      disabled={!isOnline}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Mark Full Amount as Paid
                    </Button>
                  ) : null;
                })()}
            </div>
          </div>

          {/* Drag handle at bottom */}
          <div className="flex justify-center pb-3 pt-2" data-drag-handle>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
        </SheetContent>
      </Sheet>

      {/* Customer Detail Drawer */}
      <Sheet
        open={!!selectedCustomer}
        onOpenChange={open => {
          // Don't close if image viewer or gallery viewer is open or was just closed
          if (!open && (imageViewerOpen || galleryViewerOpen || imageViewerJustClosedRef.current)) {
            imageViewerJustClosedRef.current = false;
            return;
          }
          if (!open) setSelectedCustomer(null);
        }}
      >
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0" hideClose>
          {selectedCustomer && (
            <>
              {/* Drag handle */}
              <div className="flex justify-center pb-2 pt-3" data-drag-handle>
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header with actions */}
              <SheetHeader className="border-b px-4 pb-3">
                <div className="flex items-center gap-3">
                  {/* Profile Picture */}
                  <Avatar
                    className={cn(
                      "h-14 w-14 flex-shrink-0",
                      selectedCustomer.profilePicture &&
                        "cursor-pointer transition-all hover:ring-2 hover:ring-primary"
                    )}
                    onClick={() => {
                      if (selectedCustomer.profilePicture) {
                        setImageViewerSrc(selectedCustomer.profilePicture);
                        setImageViewerOpen(true);
                      }
                    }}
                  >
                    <AvatarImage src={selectedCustomer.profilePicture} />
                    <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                      {getCustomerInitials(selectedCustomer.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name and info */}
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="truncate text-xl font-bold">
                      {selectedCustomer.name}
                    </SheetTitle>
                    {selectedCustomer.phone && (
                      <a
                        href={`tel:${selectedCustomer.phone}`}
                        className="inline-flex w-fit items-center gap-1 text-sm text-primary"
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
                      className="h-8 w-40 text-xs"
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
                      Edit Customer Profile
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

              <ScrollArea className="h-[calc(85vh-100px)] flex-1">
                <div className="space-y-4 p-4">
                  {/* Address if available */}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {selectedCustomer.address}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="min-w-0 rounded-xl bg-muted/50 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Total</p>
                      <p
                        className={cn(
                          "truncate font-bold",
                          getAmountTextSize(selectedCustomer.totalAmount || 0, "lg")
                        )}
                      >
                        ₹{(selectedCustomer.totalAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-green-500/10 p-3 text-center">
                      <p className="text-[10px] text-green-600">Paid</p>
                      <p
                        className={cn(
                          "truncate font-bold text-green-600",
                          getAmountTextSize(selectedCustomer.paidAmount || 0, "lg")
                        )}
                      >
                        ₹{(selectedCustomer.paidAmount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl bg-amber-500/10 p-3 text-center">
                      <p className="text-[10px] text-amber-600">Pending</p>
                      <p
                        className={cn(
                          "truncate font-bold text-amber-600",
                          getAmountTextSize(selectedCustomer.pendingAmount || 0, "lg")
                        )}
                      >
                        ₹{(selectedCustomer.pendingAmount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
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
                      <Plus className="mr-2 h-4 w-4" />
                      Add Udhar
                    </Button>

                    {selectedCustomerKhataPhotos.length > 0 && (
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => setKhataPhotosSheetOpen(true)}
                      >
                        <Camera className="h-4 w-4" />
                        Photos ({selectedCustomerKhataPhotos.length})
                      </Button>
                    )}
                  </div>

                  {/* Transactions Section - Directly visible */}
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <Banknote className="h-4 w-4" />
                      Transactions ({selectedCustomerTransactions.length})
                    </h3>

                    {selectedCustomerTransactions.length === 0 ? (
                      <div className="rounded-xl bg-muted/30 py-6 text-center text-muted-foreground">
                        <IndianRupee className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">No transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {selectedCustomerTransactions.map(txn => {
                          const total =
                            txn.amount || (txn.cashAmount || 0) + (txn.onlineAmount || 0);
                          const paid =
                            txn.paidAmount || (txn.paidCash || 0) + (txn.paidOnline || 0);
                          const pending = Math.max(0, total - paid);
                          const isPaid = txn.paymentStatus === "paid";
                          const isPartial = txn.paymentStatus === "partial";
                          const hasPayments = txn.payments && txn.payments.length > 0;
                          const isExpanded = expandedUdharId === txn.id;

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
                                isExpanded && hasPayments && "shadow-md ring-2 ring-primary/20"
                              )}
                            >
                              <CardContent className="p-0">
                                <div
                                  className={cn(
                                    "p-3 transition-colors",
                                    hasPayments && "cursor-pointer",
                                    isExpanded ? "bg-primary/5" : hasPayments && "hover:bg-muted/30"
                                  )}
                                  onClick={() =>
                                    hasPayments && setExpandedUdharId(isExpanded ? null : txn.id)
                                  }
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="mb-0.5 flex items-center gap-2">
                                        <span className="text-lg font-bold">
                                          ₹{total.toLocaleString()}
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
                                                                                    {isPaid ? "Fully Paid" : isPartial ? "Partially Paid" : "Total Pending"}

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
                                    <div className="flex items-center gap-1">
                                      {!isPaid && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 border-green-200 bg-green-50 text-xs text-green-700 hover:bg-green-100"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleOpenPayment(txn);
                                          }}
                                          disabled={!isOnline}
                                        >
                                          <CreditCard className="mr-1 h-3 w-3" />
                                          Collect
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={e => {
                                          e.stopPropagation();
                                          if (!isOnline) {
                                            toast.error("Cannot edit while offline");
                                            return;
                                          }
                                          setUdharToEdit(txn);
                                          setUdharFormOpen(true);
                                        }}
                                        disabled={!isOnline}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={async e => {
                                          e.stopPropagation();
                                          if (!isOnline) {
                                            toast.error("Cannot delete while offline");
                                            return;
                                          }
                                          if (
                                            confirm(
                                              "Are you sure you want to delete this transaction?"
                                            )
                                          ) {
                                            const result = await deleteUdhar(txn.id);
                                            if (result.success) {
                                              toast.success("Transaction deleted");
                                            } else {
                                              toast.error("Failed to delete");
                                            }
                                          }
                                        }}
                                        disabled={!isOnline}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
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
                                          style={{ width: `${(paid / total) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Expanded Section */}
                                {isExpanded && hasPayments && (
                                  <div className="border-t bg-primary/5 px-3 pb-3">
                                    {/* Payment Receipts as thumbnails */}
                                    {txn.payments?.some(p => p.receiptUrl) && (
                                      <div className="pt-3">
                                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                                          Payment Receipts (
                                          {txn.payments.filter(p => p.receiptUrl).length})
                                        </p>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                          {txn.payments
                                            .filter(p => p.receiptUrl)
                                            .map((payment, idx, filteredPayments) => {
                                              const receiptPhotos = filteredPayments.map(p => ({
                                                url: p.receiptUrl,
                                                amount: p.amount,
                                                date: p.date,
                                                customerName: selectedCustomer?.name,
                                                type: "receipt",
                                              }));
                                              return (
                                                <div
                                                  key={payment.id}
                                                  className="relative h-14 w-14 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-green-200 bg-muted"
                                                  onClick={e => {
                                                    e.stopPropagation();
                                                    setGalleryImages(receiptPhotos);
                                                    setGalleryInitialIndex(idx);
                                                    setGalleryViewerOpen(true);
                                                  }}
                                                >
                                                  <img
                                                    src={payment.receiptUrl}
                                                    alt={`Receipt ${idx + 1}`}
                                                    className="h-full w-full object-cover"
                                                  />
                                                  <div className="absolute bottom-0 left-0 right-0 bg-green-600/90 py-0.5 text-center text-[9px] text-white">
                                                    ₹{payment.amount?.toLocaleString()}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    )}

                                    <div className="pt-2">
                                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                                        Received Payments History
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
                                                    index === 0 ? "bg-green-500" : "bg-green-400"
                                                  )}
                                                >
                                                  <CheckCircle2 className="h-2 w-2 text-white" />
                                                </div>
                                                {index < arr.length - 1 && (
                                                  <div className="h-full min-h-[20px] w-0.5 bg-green-300" />
                                                )}
                                              </div>
                                              <div className="flex-1 pb-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span className="font-semibold text-green-600">
                                                    ₹{payment.amount.toLocaleString()}
                                                  </span>
                                                  <span className="text-xs text-muted-foreground">
                                                    —{" "}
                                                    {new Date(payment.date).toLocaleDateString(
                                                      "en-IN",
                                                      {
                                                        day: "numeric",
                                                        month: "short",
                                                      }
                                                    )}
                                                  </span>
                                                </div>
                                                {payment.notes && (
                                                  <p className="mt-0.5 text-xs italic text-muted-foreground">
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
          onOpenChange={open => {
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
              This will permanently delete {customerToDelete?.name} and all their Udhar
              transactions. This action cannot be undone.
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
              This will delete the payment of ₹{paymentToDelete?.amount?.toLocaleString() || 0}. The
              udhar balance will be recalculated. This action cannot be undone.
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
          {udharDrawerCustomer &&
            (() => {
              const customerTransactions = udharList
                .filter(u => u.customerId === udharDrawerCustomer.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

              return (
                <>
                  {/* Drag handle */}
                  <div className="flex justify-center pb-2 pt-3">
                    <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                  </div>

                  {/* Header */}
                  <SheetHeader className="border-b px-4 pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={udharDrawerCustomer.profilePicture} />
                        <AvatarFallback className="bg-primary/10 font-semibold text-primary">
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

                  <ScrollArea className="h-[calc(90vh-120px)] flex-1">
                    <div className="space-y-3 p-4">
                      {customerTransactions.length === 0 ? (
                        <div className="py-8 text-center">
                          <Banknote className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No transactions yet</p>
                        </div>
                      ) : (
                        customerTransactions.map(txn => {
                          const total =
                            txn.amount || (txn.cashAmount || 0) + (txn.onlineAmount || 0);
                          const paid =
                            txn.paidAmount || (txn.paidCash || 0) + (txn.paidOnline || 0);
                          const pending = Math.max(0, total - paid);
                          const isPaid = txn.paymentStatus === "paid";
                          const isPartial = txn.paymentStatus === "partial";
                          const hasPayments = txn.payments && txn.payments.length > 0;
                          const hasBillImages =
                            txn.khataPhotos?.length > 0 || txn.billImages?.length > 0;
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
                                  className="cursor-pointer p-4 transition-colors hover:bg-muted/30"
                                  onClick={() => setExpandedUdharId(isExpanded ? null : txn.id)}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="mb-1 flex items-center gap-2">
                                        <span className="text-xl font-bold">
                                          ₹{total.toLocaleString()}
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
                                                                                    {isPaid ? "Fully Paid" : isPartial ? "Partially Paid" : "Total Pending"}

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
                                          className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleOpenPayment(txn);
                                          }}
                                          disabled={!isOnline}
                                        >
                                          <CreditCard className="mr-1 h-4 w-4" />
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
                                      <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="text-green-600">
                                          Paid: ₹{paid.toLocaleString()}
                                        </span>
                                        <span className="text-amber-600">
                                          Pending: ₹{pending.toLocaleString()}
                                        </span>
                                      </div>
                                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                                        <div
                                          className="h-full rounded-full bg-green-500 transition-all"
                                          style={{ width: `${(paid / total) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Expanded Section */}
                                {isExpanded && (
                                  <div className="border-t bg-muted/20 px-4 pb-4">
                                    {/* Khata Photos */}
                                    {(txn.khataPhotos?.length > 0 ||
                                      txn.billImages?.length > 0) && (
                                      <div className="pt-3">
                                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                                          Khata Photos
                                        </p>
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                          {[
                                            ...(txn.khataPhotos || []),
                                            ...(txn.billImages || []),
                                          ].map((photo, idx) => {
                                            const txnPhotos = [
                                              ...(txn.khataPhotos || []),
                                              ...(txn.billImages || []),
                                            ].map(p => ({
                                              url: p,
                                              amount: total,
                                              date: txn.date,
                                              customerName: selectedCustomer?.name,
                                              type: "khata",
                                            }));
                                            return (
                                              <div
                                                key={idx}
                                                className="h-16 w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-muted"
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  setGalleryImages(txnPhotos);
                                                  setGalleryInitialIndex(idx);
                                                  setGalleryViewerOpen(true);
                                                }}
                                              >
                                                <img
                                                  src={photo}
                                                  alt={`Khata ${idx + 1}`}
                                                  className="h-full w-full object-cover"
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Payment Receipts */}
                                    {txn.payments?.some(p => p.receiptUrl) && (
                                      <div className="pt-3">
                                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                                          Payment Receipts (
                                          {txn.payments.filter(p => p.receiptUrl).length})
                                        </p>
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                          {txn.payments
                                            .filter(p => p.receiptUrl)
                                            .map((payment, idx, filteredPayments) => {
                                              const receiptPhotos = filteredPayments.map(p => ({
                                                url: p.receiptUrl,
                                                amount: p.amount,
                                                date: p.date,
                                                customerName: selectedCustomer?.name,
                                                type: "receipt",
                                              }));
                                              return (
                                                <div
                                                  key={payment.id}
                                                  className="relative h-16 w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-green-200 bg-muted"
                                                  onClick={e => {
                                                    e.stopPropagation();
                                                    setGalleryImages(receiptPhotos);
                                                    setGalleryInitialIndex(idx);
                                                    setGalleryViewerOpen(true);
                                                  }}
                                                >
                                                  <img
                                                    src={payment.receiptUrl}
                                                    alt={`Receipt ${idx + 1}`}
                                                    className="h-full w-full object-cover"
                                                  />
                                                  <div className="absolute bottom-0 left-0 right-0 bg-green-600/90 py-0.5 text-center text-[10px] text-white">
                                                    ₹{payment.amount?.toLocaleString()}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Payment History */}
                                    {hasPayments && (
                                      <div className="pt-3">
                                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                                          Received Payments History
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
                                                      index === 0 ? "bg-green-500" : "bg-green-400"
                                                    )}
                                                  >
                                                    <CheckCircle2 className="h-2 w-2 text-white" />
                                                  </div>
                                                  {index < arr.length - 1 && (
                                                    <div className="h-full min-h-[24px] w-0.5 bg-green-300" />
                                                  )}
                                                </div>
                                                <div className="flex-1 pb-3">
                                                  <div className="flex flex-wrap items-center gap-2">
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
                                                  {payment.notes && (
                                                    <p className="mt-0.5 text-xs italic text-muted-foreground">
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
                                        </div>
                                      </div>
                                    )}

                                    {/* Delete Button */}
                                    <div className="mt-3 border-t pt-3">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                                        onClick={async e => {
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
                                        <Trash2 className="mr-2 h-4 w-4" />
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

      {/* All Receipts Sheet */}
      <Sheet
        open={allReceiptsSheetOpen}
        onOpenChange={open => {
          // Don't close if image viewer or gallery viewer is open or was just closed
          if (!open && (imageViewerOpen || galleryViewerOpen || imageViewerJustClosedRef.current)) {
            imageViewerJustClosedRef.current = false;
            return;
          }
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
                <X className="h-4 w-4" />
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {allReceipts.map((receipt, idx) => (
                    <div
                      key={idx}
                      className="relative cursor-pointer overflow-hidden rounded-xl border bg-muted transition-shadow hover:shadow-md"
                      onClick={() => {
                        setAllReceiptsGalleryImages(allReceipts.map(r => r.url));
                        setAllReceiptsGalleryInitialIndex(idx);
                        setAllReceiptsGalleryOpen(true);
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
                            {receipt.type === "receipt" ? "Receipt" : "Khata"}
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

      {/* Customer Khata Photos Sheet */}
      <Sheet
        open={khataPhotosSheetOpen}
        onOpenChange={open => {
          // Don't close if gallery viewer is open
          if (!open && galleryViewerOpen) return;
          setKhataPhotosSheetOpen(open);
        }}
      >
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              All Khata Photos ({selectedCustomerKhataPhotos.length})
            </SheetTitle>
            <SheetDescription>
              Photos from all transactions for {selectedCustomer?.name}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="mt-4 h-[calc(85vh-120px)]">
            <div className="grid grid-cols-2 gap-3 pr-4">
              {selectedCustomerKhataPhotos.map((photo, index) => (
                <div
                  key={`${photo.udharId}-${photo.photoIndex}`}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
                >
                  <img
                    src={photo.url}
                    alt={`Khata photo ${index + 1}`}
                    className="h-full w-full cursor-pointer object-cover transition-transform hover:scale-105"
                    onClick={() => {
                      setGalleryImages(selectedCustomerKhataPhotos);
                      setGalleryInitialIndex(index);
                      setGalleryViewerOpen(true);
                    }}
                  />
                  {/* Overlay with info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                    <p className="text-sm font-semibold text-white">
                      ₹{photo.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/80">
                      {new Date(photo.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {/* Delete button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                        disabled={!isOnline}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this khata photo. This action cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDeleteKhataPhoto(photo)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
            {selectedCustomerKhataPhotos.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Camera className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>No khata photos yet</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* All Receipts Gallery Viewer */}
      <ImageGalleryViewer
        images={allReceiptsGalleryImages}
        initialIndex={allReceiptsGalleryInitialIndex}
        open={allReceiptsGalleryOpen}
        onOpenChange={setAllReceiptsGalleryOpen}
      />

      {/* Image Viewer */}
      <ImageViewer
        src={imageViewerSrc}
        alt="Profile Picture"
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
      />

      {/* Gallery Viewer for multiple images */}
      <ImageGalleryViewer
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        open={galleryViewerOpen}
        onOpenChange={setGalleryViewerOpen}
      />
    </div>
  );
}
