"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  MapPin,
  FileText,
  Plus,
  IndianRupee,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  CreditCard,
  Receipt,
  Camera,
  ImagePlus,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { ImageViewer } from "@/components/ImageViewer";
import { compressImage } from "@/lib/image-compression";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";
import { SupplierForm } from "@/components/SupplierForm";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionTable } from "@/components/TransactionTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";

export default function SupplierDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const { suppliers, getSupplierById, updateSupplier, deleteSupplier } =
    useSuppliers();
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    recordPayment,
    markFullPaid,
  } = useTransactions(id);

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleteTransactionDialogOpen, setDeleteTransactionDialogOpen] =
    useState(false);
  const [upiCopied, setUpiCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const paymentInputRef = useRef(null);
  const receiptInputRef = useRef(null);
  const receiptGalleryInputRef = useRef(null);

  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState("");

  // Bulk delete state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteOption, setBulkDeleteOption] = useState("6months");
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState("");

  useEffect(() => {
    const loadSupplier = async () => {
      const data = await getSupplierById(id);
      setSupplier(data);
      setLoading(false);
    };
    loadSupplier();
  }, [id, getSupplierById]);

  useEffect(() => {
    if (!loading) {
      const updatedSupplier = suppliers.find((s) => s.id === id);
      if (updatedSupplier) {
        setSupplier(updatedSupplier);
      }
    }
  }, [suppliers, id, loading]);

  // Auto-focus and scroll payment input into view
  useEffect(() => {
    if (paymentDialogOpen && paymentInputRef.current) {
      setTimeout(() => {
        paymentInputRef.current?.focus();
        // Scroll the input into view for mobile keyboards
        paymentInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 500);
    }
  }, [paymentDialogOpen]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        {/* Back button skeleton */}
        <div className="h-10 w-24 bg-muted rounded animate-pulse" />

        {/* Profile card skeleton */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border rounded-lg p-4 space-y-2">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Transactions skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-4 lg:p-6 text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Supplier not found</h2>
        <p className="text-muted-foreground mb-4">
          The supplier you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/suppliers">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
        </Link>
      </div>
    );
  }

  // Display company name prominently
  const displayName = supplier.companyName || supplier.name;
  const secondaryName = supplier.companyName ? supplier.name : null;

  const initials =
    displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  // Calculate paid amount considering partial payments
  const paidAmount = transactions.reduce((sum, t) => {
    if (t.paymentStatus === "paid") {
      return sum + (t.amount || 0);
    } else if (t.paymentStatus === "partial") {
      return sum + (t.paidAmount || 0);
    }
    return sum;
  }, 0);
  const pendingAmount = totalAmount - paidAmount;

  const handleUpdateSupplier = async (data) => {
    const result = await updateSupplier(id, data);
    if (result.success) {
      setSupplier(result.data);
      toast.success("Supplier updated");
    } else {
      toast.error("Failed to update supplier");
    }
  };

  const handleDeleteSupplier = async () => {
    const result = await deleteSupplier(id);
    if (result.success) {
      toast.success("Supplier deleted");
      router.push("/suppliers");
    } else {
      toast.error("Failed to delete supplier");
    }
  };

  const handleAddTransaction = async (data) => {
    const result = await addTransaction(data);
    if (result.success) {
      toast.success("Transaction added");
    } else {
      toast.error("Failed to add transaction");
    }
  };

  const handleEditTransaction = (transaction) => {
    setTransactionToEdit(transaction);
    setTransactionFormOpen(true);
  };

  const handleUpdateTransaction = async (data) => {
    const result = await updateTransaction(transactionToEdit.id, data);
    if (result.success) {
      toast.success("Transaction updated");
      setTransactionToEdit(null);
    } else {
      toast.error("Failed to update transaction");
    }
  };

  const handleDeleteTransactionClick = (transaction) => {
    setTransactionToDelete(transaction);
    setDeleteTransactionDialogOpen(true);
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
    }
  };

  // Payment handling
  const handleOpenPayment = (transaction) => {
    const currentPaid = transaction.paidAmount || 0;
    const remaining = (transaction.amount || 0) - currentPaid;
    setPaymentTransaction(transaction);
    setPaymentAmount(remaining.toString());
    setPaymentReceipt(null);
    setPaymentDialogOpen(true);
  };

  const handleReceiptSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReceipt(true);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
        maxSizeKB: 500,
      });

      // Create local preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPaymentReceipt(e.target.result);
      };
      reader.readAsDataURL(compressedFile);

      // Upload file
      const formData = new FormData();
      formData.append("file", compressedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { url } = await response.json();
        setPaymentReceipt(url);
        toast.success("Receipt uploaded");
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentTransaction || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const result = await recordPayment(
      paymentTransaction.id,
      Number(paymentAmount),
      paymentReceipt,
    );

    if (result.success) {
      toast.success(
        `₹${Number(paymentAmount).toLocaleString()} payment recorded`,
      );
      setPaymentDialogOpen(false);
      setPaymentTransaction(null);
      setPaymentAmount("");
      setPaymentReceipt(null);
    } else {
      toast.error(result.error || "Failed to record payment");
    }
  };

  const handleMarkFullPaid = async () => {
    if (!paymentTransaction) return;

    const result = await markFullPaid(paymentTransaction.id, paymentReceipt);

    if (result.success) {
      toast.success("Marked as fully paid");
      setPaymentDialogOpen(false);
      setPaymentTransaction(null);
      setPaymentAmount("");
      setPaymentReceipt(null);
    } else {
      toast.error(result.error || "Failed to mark as paid");
    }
  };

  const handleViewImage = (src) => {
    setImageViewerSrc(src);
    setImageViewerOpen(true);
  };

  // Bulk delete functions
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

    return transactions.filter((t) => new Date(t.date) < cutoffDate);
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

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

    setBulkDeleteDialogOpen(false);
    setBulkDeleteConfirmText("");
  };

  const handleUpiClick = (app = "gpay") => {
    if (supplier?.upiId) {
      // Pre-fill amount if there's pending payment
      const amountParam = pendingAmount > 0 ? `&am=${pendingAmount}` : "";
      const upiParams = `pa=${encodeURIComponent(supplier.upiId)}&pn=${encodeURIComponent(displayName || "Supplier")}&cu=INR${amountParam}`;

      if (app === "gpay") {
        const gpayIntent = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.location.href = `gpay://upi/pay?${upiParams}`;
        } else {
          window.location.href = gpayIntent;
        }
      } else if (app === "phonepe") {
        window.location.href = `phonepe://pay?${upiParams}`;
      } else if (app === "paytm") {
        window.location.href = `paytmmp://pay?${upiParams}`;
      } else {
        window.location.href = `upi://pay?${upiParams}`;
      }
    }
  };

  const handleCopyUpi = async () => {
    if (supplier?.upiId) {
      try {
        await navigator.clipboard.writeText(supplier.upiId);
        setUpiCopied(true);
        toast.success("UPI ID copied!");
        setTimeout(() => setUpiCopied(false), 2000);
      } catch (err) {
        toast.error("Failed to copy");
      }
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/suppliers">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{displayName}</h1>
          {secondaryName && (
            <p className="text-sm text-muted-foreground truncate">
              {secondaryName}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setEditFormOpen(true)}
            disabled={!isOnline}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!isOnline}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Profile Card with UPI */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar - Clickable to view full image */}
            <div
              className={cn(
                "shrink-0",
                supplier.profilePicture && "cursor-pointer",
              )}
              onClick={() =>
                supplier.profilePicture &&
                handleViewImage(supplier.profilePicture)
              }
            >
              <Avatar className="h-16 w-16 border-2 border-primary/10">
                <AvatarImage src={supplier.profilePicture} alt={displayName} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-2">
              {supplier.phone && (
                <a
                  href={`tel:${supplier.phone}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{supplier.phone}</span>
                </a>
              )}
              {supplier.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{supplier.address}</span>
                </div>
              )}
              {supplier.gstNumber && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>GST: {supplier.gstNumber}</span>
                </div>
              )}

              {/* Sync status */}
              {supplier.syncStatus === "pending" && (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-500/30"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                  Syncing
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UPI Payment Section */}
      {(supplier.upiId || supplier.upiQrCode) && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* QR Code */}
              {supplier.upiQrCode && (
                <div
                  className="w-20 h-20 rounded-lg overflow-hidden border-2 border-background shadow-lg cursor-pointer hover:scale-105 transition-transform relative shrink-0"
                  onClick={() => setQrDialogOpen(true)}
                >
                  <Image
                    src={supplier.upiQrCode}
                    alt="UPI QR Code"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* UPI Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">UPI Payment</span>
                </div>

                {supplier.upiId && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-muted rounded text-xs truncate max-w-[150px]">
                        {supplier.upiId}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyUpi}
                        className="h-7 w-7 p-0 shrink-0"
                      >
                        {upiCopied ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleUpiClick("gpay")}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        GPay
                      </button>
                      <button
                        onClick={() => handleUpiClick("phonepe")}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-medium hover:bg-purple-700 transition-colors"
                      >
                        PhonePe
                      </button>
                      <button
                        onClick={() => handleUpiClick("other")}
                        className="px-3 py-1.5 bg-muted text-foreground rounded-full text-xs font-medium hover:bg-accent transition-colors"
                      >
                        Other
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <div className="flex items-center gap-2">
            {transactions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={!isOnline}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Bulk Delete
              </Button>
            )}
            <Button
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
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <IndianRupee className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setTransactionFormOpen(true)}
                disabled={!isOnline}
              >
                Add first transaction
              </Button>
            </CardContent>
          </Card>
        ) : (
          <TransactionTable
            transactions={transactions}
            suppliers={[supplier]}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransactionClick}
            onPay={handleOpenPayment}
            showSupplier={false}
          />
        )}
      </div>

      {/* Payment Sheet */}
      <Sheet open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0 flex flex-col max-h-[80vh]"
          hideClose
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-6 pb-4">
            <SheetTitle>Pay Supplier</SheetTitle>
            <SheetDescription>
              Record a payment for this transaction
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              {paymentTransaction && (
                <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-bold text-lg">
                      ₹{paymentTransaction.amount?.toLocaleString()}
                    </span>
                  </div>
                  {(paymentTransaction.paidAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Already Paid</span>
                      <span className="font-medium text-green-600">
                        ₹{(paymentTransaction.paidAmount || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t pt-3">
                    <span className="text-amber-600 font-medium">Pending</span>
                    <span className="font-bold text-lg text-amber-600">
                      ₹
                      {(
                        (paymentTransaction.amount || 0) -
                        (paymentTransaction.paidAmount || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                  {paymentTransaction.itemName && (
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>Item</span>
                      <span className="truncate max-w-[150px]">
                        {paymentTransaction.itemName}
                      </span>
                    </div>
                  )}
                </div>
              )}

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

              {/* Payment Receipt Upload */}
              <div className="space-y-2">
                <Label className="text-sm">Payment Receipt (Optional)</Label>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleReceiptSelect}
                  className="hidden"
                />
                <input
                  ref={receiptGalleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptSelect}
                  className="hidden"
                />
                {paymentReceipt ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={paymentReceipt}
                      alt="Payment Receipt"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => handleViewImage(paymentReceipt)}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7"
                      onClick={() => setPaymentReceipt(null)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {isUploadingReceipt && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
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
                )}
                <p className="text-xs text-muted-foreground">
                  Attach UPI screenshot or payment proof
                </p>
              </div>

              {/* UPI Quick Pay */}
              {supplier.upiId && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Quick Pay via UPI
                  </Label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpiClick("gpay")}
                      className="flex-1 px-3 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      GPay
                    </button>
                    <button
                      onClick={() => handleUpiClick("phonepe")}
                      className="flex-1 px-3 py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      PhonePe
                    </button>
                    <button
                      onClick={() => handleUpiClick("other")}
                      className="flex-1 px-3 py-3 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                    >
                      Other
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 px-6 py-4 border-t bg-background z-10 safe-area-bottom">
            <div className="flex flex-col gap-3 w-full">
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setPaymentTransaction(null);
                    setPaymentAmount("");
                  }}
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                  disabled={
                    !isOnline || !paymentAmount || Number(paymentAmount) <= 0
                  }
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </div>
              {paymentTransaction &&
                (paymentTransaction.amount || 0) -
                  (paymentTransaction.paidAmount || 0) >
                  0 && (
                  <Button
                    variant="outline"
                    onClick={handleMarkFullPaid}
                    className="w-full h-12 text-green-600 border-green-200 hover:bg-green-50"
                    disabled={!isOnline}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Full Amount as Paid
                  </Button>
                )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Supplier Form */}
      <SupplierForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        onSubmit={handleUpdateSupplier}
        initialData={supplier}
        title="Edit Supplier"
      />

      {/* Transaction Form */}
      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={(open) => {
          setTransactionFormOpen(open);
          if (!open) setTransactionToEdit(null);
        }}
        onSubmit={
          transactionToEdit ? handleUpdateTransaction : handleAddTransaction
        }
        suppliers={[supplier]}
        initialData={transactionToEdit}
        defaultSupplierId={id}
        title={transactionToEdit ? "Edit Transaction" : "Add Transaction"}
      />

      {/* Delete Supplier Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSupplier}
        title="Delete Supplier"
        description="Are you sure? All transactions will also be deleted."
        itemName={displayName}
      />

      {/* Delete Transaction Confirmation */}
      <DeleteConfirmDialog
        open={deleteTransactionDialogOpen}
        onOpenChange={setDeleteTransactionDialogOpen}
        onConfirm={handleConfirmDeleteTransaction}
        title="Delete Transaction"
        description="This action cannot be undone."
        itemName={
          transactionToDelete
            ? `₹${transactionToDelete.amount?.toLocaleString()}`
            : ""
        }
      />

      {/* QR Code Full View Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">Scan to Pay</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {supplier?.upiQrCode && (
              <div
                className="w-56 h-56 rounded-lg overflow-hidden border-2 border-muted relative bg-white cursor-pointer"
                onClick={() => {
                  setQrDialogOpen(false);
                  handleViewImage(supplier.upiQrCode);
                }}
              >
                <Image
                  src={supplier.upiQrCode}
                  alt="UPI QR Code"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            {supplier?.upiId && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">UPI ID</p>
                <p className="font-medium">{supplier.upiId}</p>
              </div>
            )}
            <Button onClick={() => handleUpiClick("other")} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in UPI App
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer */}
      <ImageViewer
        src={imageViewerSrc}
        alt="Full Image"
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
      />

      {/* Bulk Delete Dialog */}
      <Sheet open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0 flex flex-col max-h-[80vh]"
          hideClose
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-6 pb-4">
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Bulk Delete Transactions
            </SheetTitle>
            <SheetDescription>
              Permanently delete multiple transactions. This action cannot be
              undone.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              {/* Delete Options */}
              <div className="space-y-2">
                <Label>Select transactions to delete</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      name="bulkDelete"
                      value="6months"
                      checked={bulkDeleteOption === "6months"}
                      onChange={(e) => setBulkDeleteOption(e.target.value)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Older than 6 months</span>
                      <p className="text-xs text-muted-foreground">
                        {
                          transactions.filter(
                            (t) =>
                              new Date(t.date) <
                              new Date(
                                new Date().setMonth(new Date().getMonth() - 6),
                              ),
                          ).length
                        }{" "}
                        transactions
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      name="bulkDelete"
                      value="1year"
                      checked={bulkDeleteOption === "1year"}
                      onChange={(e) => setBulkDeleteOption(e.target.value)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">Older than 1 year</span>
                      <p className="text-xs text-muted-foreground">
                        {
                          transactions.filter(
                            (t) =>
                              new Date(t.date) <
                              new Date(
                                new Date().setFullYear(
                                  new Date().getFullYear() - 1,
                                ),
                              ),
                          ).length
                        }{" "}
                        transactions
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <input
                      type="radio"
                      name="bulkDelete"
                      value="previousYear"
                      checked={bulkDeleteOption === "previousYear"}
                      onChange={(e) => setBulkDeleteOption(e.target.value)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium">
                        Previous year ({new Date().getFullYear() - 1})
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {
                          transactions.filter(
                            (t) =>
                              new Date(t.date) <
                              new Date(new Date().getFullYear() - 1, 11, 31),
                          ).length
                        }{" "}
                        transactions
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 cursor-pointer hover:bg-destructive/5">
                    <input
                      type="radio"
                      name="bulkDelete"
                      value="all"
                      checked={bulkDeleteOption === "all"}
                      onChange={(e) => setBulkDeleteOption(e.target.value)}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-destructive">
                        All transactions
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {transactions.length} transactions (entire history)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Confirmation Input */}
              <div className="space-y-2 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <Label className="text-destructive">
                  Type &quot;DELETE&quot; to confirm
                </Label>
                <Input
                  value={bulkDeleteConfirmText}
                  onChange={(e) =>
                    setBulkDeleteConfirmText(e.target.value.toUpperCase())
                  }
                  placeholder="DELETE"
                  className="text-center font-mono"
                />
              </div>
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 px-6 py-4 border-t bg-background z-10 safe-area-bottom">
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setBulkDeleteDialogOpen(false);
                  setBulkDeleteConfirmText("");
                }}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={
                  !isOnline ||
                  bulkDeleteConfirmText !== "DELETE" ||
                  getTransactionsToDelete().length === 0
                }
                className="flex-1 h-12"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {getTransactionsToDelete().length} Transactions
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
