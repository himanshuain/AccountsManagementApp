/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MoreVertical,
  Send,
  Plus,
  Copy,
  ExternalLink,
  Check,
  Pencil,
  Trash2,
  X,
  Receipt,
  Image as ImageIcon,
  Calendar,
  FileText,
  CreditCard,
  Clock,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Images,
  FileDown,
  Camera,
  ImagePlus,
  Expand,
  Search,
} from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { toast } from "sonner";

import { useSuppliers } from "@/hooks/useSuppliers";
import { useCustomers } from "@/hooks/useCustomers";
import { useTransactions } from "@/hooks/useTransactions";
import { useUdhar } from "@/hooks/useUdhar";
import { usePreventBodyScroll } from "@/hooks/usePreventBodyScroll";

import { PersonAvatar } from "@/components/gpay/PersonAvatar";
import { TransactionForm } from "@/components/TransactionForm";
import { UdharForm } from "@/components/UdharForm";
import { SupplierForm } from "@/components/SupplierForm";
import { CustomerForm } from "@/components/CustomerForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  PhotoGalleryViewer as ImageGalleryViewer,
  PhotoViewer as ImageViewer,
} from "@/components/PhotoViewer";
import { ProgressBar } from "@/components/gpay/PaymentProgress";
import { resolveImageUrl, getImageUrls, isDataUrl } from "@/lib/image-url";
import { exportSupplierTransactionsPDF } from "@/lib/export";
import { compressImage, compressForHD } from "@/lib/image-compression";
import { cn } from "@/lib/utils";
import { getLocalDate } from "@/lib/date-utils";
import { Separator } from "@/components/ui/separator";
import { PaymentFormModal, BillsGalleryModal } from "@/components/person";

// Edit Payment Modal Component
function EditPaymentModal({ payment, txn, onClose, onSave, isSubmitting }) {
  const [amount, setAmount] = useState(String(payment?.amount || ""));
  const [date, setDate] = useState(payment?.date ? payment.date.split("T")[0] : getLocalDate());
  const [notes, setNotes] = useState(payment?.notes || "");
  const [isReturn, setIsReturn] = useState(!!payment?.isReturn);
  const [receiptImages, setReceiptImages] = useState(() => {
    // Support both old (receiptUrl) and new (receiptUrls) format
    if (payment?.receiptUrls && payment.receiptUrls.length > 0) {
      return payment.receiptUrls;
    }
    if (payment?.receiptUrl) {
      return [payment.receiptUrl];
    }
    return [];
  });
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isHDMode, setIsHDMode] = useState(false); // HD mode toggle

  // Handle image tap to view
  const handleImageTap = index => {
    setViewerIndex(index);
    setImageViewerOpen(true);
  };
  const [isUploading, setIsUploading] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const totalAmount = Number(txn?.amount) || 0;
  const otherPaidAmount = (txn?.payments || [])
    .filter(p => p.id !== payment?.id)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const maxAmount = totalAmount - otherPaidAmount;

  const handleFileSelect = async e => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 5 - receiptImages.length;
    const filesToUpload = files.slice(0, remainingSlots);

    setIsUploading(true);
    const newImages = [];

    for (const file of filesToUpload) {
      try {
        // Use HD compression if enabled
        let compressedFile;
        if (isHDMode) {
          compressedFile = await compressForHD(file);
          console.log(
            `[HD Upload] Original: ${Math.round(file.size / 1024)}KB → Compressed: ${Math.round(compressedFile.size / 1024)}KB`
          );
        } else {
          compressedFile = await compressImage(file, {
            maxWidth: 2048,
            maxHeight: 2048,
            quality: 0.9,
            maxSizeKB: 800,
            useWebP: false,
          });
        }

        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("folder", "payments");

        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            newImages.push(result.storageKey || result.url);
          } else {
            const localUrl = await new Promise(resolve => {
              const reader = new FileReader();
              reader.onload = e => resolve(e.target.result);
              reader.readAsDataURL(compressedFile);
            });
            newImages.push(localUrl);
          }
        } catch {
          const localUrl = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(compressedFile);
          });
          newImages.push(localUrl);
        }
      } catch (error) {
        console.error("File processing failed:", error);
      }
    }

    setReceiptImages([...receiptImages, ...newImages]);
    setIsUploading(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleRemoveImage = index => {
    setReceiptImages(receiptImages.filter((_, i) => i !== index));
  };

  const handleSubmit = e => {
    e.preventDefault();
    const paymentAmount = Number(amount);
    // For GR, allow zero; for regular payments, require positive amount
    if (!isReturn && paymentAmount <= 0) {
      toast.error("Enter valid amount");
      return;
    }
    if (isReturn && paymentAmount < 0) {
      toast.error("Amount cannot be negative");
      return;
    }
    if (!isReturn && paymentAmount > maxAmount) {
      toast.error(`Max amount is ₹${maxAmount.toLocaleString("en-IN")}`);
      return;
    }
    onSave({
      amount: paymentAmount,
      date: date + "T00:00:00.000Z",
      notes: notes,
      receiptUrl: receiptImages[0] || null,
      receiptUrls: receiptImages,
      isReturn: isReturn,
    });
  };

  if (!payment) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-slide-up max-h-[90vh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-card sm:max-w-md sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 flex justify-center bg-card py-3 sm:hidden">
          <div className="sheet-handle" />
        </div>

        <div className="p-4 pb-16">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-lg tracking-wide">Edit Payment</h3>
            <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Payment Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="input-hero pl-12 font-mono text-lg"
                  autoFocus
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Max: ₹{maxAmount.toLocaleString("en-IN")}
              </p>
            </div>

            {/* Date Input */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Payment Date</label>
              <input
                type="date"
                value={date}
                onChange={e => {
                  const selectedDate = e.target.value;
                  const todayDate = getLocalDate();
                  // Prevent future dates (iOS Safari ignores max attribute)
                  if (selectedDate > todayDate) {
                    setDate(todayDate);
                  } else {
                    setDate(selectedDate);
                  }
                }}
                max={getLocalDate()}
                className="input-hero"
              />
            </div>

            {/* Return GR Toggle */}
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
              <div>
                <p className="text-sm font-medium">Return (GR)</p>
                <p className="text-xs text-muted-foreground">Mark as goods return</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newIsReturn = !isReturn;
                  setIsReturn(newIsReturn);
                  // Set default 0 when enabling GR
                  if (newIsReturn && !amount) {
                    setAmount("0");
                  }
                }}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  isReturn ? "bg-blue-500" : "bg-muted-foreground/30"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                    isReturn ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Notes Input */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Payment notes..."
                className="input-hero"
              />
            </div>

            {/* Receipt Images */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Payment Receipts</label>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading || receiptImages.length >= 5}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading || receiptImages.length >= 5}
              />

              <div className="flex flex-wrap gap-2">
                {receiptImages.map((img, idx) => {
                  const urls = getImageUrls(img);
                  const displayUrl = isDataUrl(img) ? img : urls.thumbnail || urls.src;
                  return (
                    <div
                      key={idx}
                      className="group relative h-16 w-16 overflow-hidden rounded-lg bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayUrl}
                        alt={`Receipt ${idx + 1}`}
                        className="h-full w-full cursor-pointer object-cover"
                        onClick={() => handleImageTap(idx)}
                      />
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveImage(idx);
                        }}
                        className="absolute right-0.5 top-0.5 rounded-full bg-destructive p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {/* Tap to expand hint */}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                        <Expand className="h-4 w-4 text-white opacity-0 group-hover:opacity-70" />
                      </div>
                    </div>
                  );
                })}

                {receiptImages.length < 5 && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {isUploading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <>
                          <Camera className="h-4 w-4 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground">Camera</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">Gallery</span>
                    </button>
                  </div>
                )}
              </div>
              {/* HD Toggle and image count */}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  {receiptImages.length}/5 images • Tap to expand
                </p>
                <button
                  type="button"
                  onClick={() => setIsHDMode(!isHDMode)}
                  disabled={isUploading}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-all",
                    isHDMode
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isHDMode ? "bg-white animate-pulse" : "bg-muted-foreground"
                    )}
                  />
                  HD {isHDMode ? "ON" : "OFF"}
                </button>
              </div>
              {isHDMode && (
                <p className="text-[9px] text-amber-600 dark:text-amber-400">
                  HD: Best quality (larger file)
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pb-safe flex gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl bg-muted py-3 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !amount || isUploading}
                className="btn-hero flex-1 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Image Viewer for receipts */}
        <ImageGalleryViewer
          images={receiptImages}
          initialIndex={viewerIndex}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
        />
      </div>
    </div>
  );
}

// Transaction Detail Modal Component with Payment Timeline
function TransactionDetailModal({
  txn,
  isSupplier,
  onClose,
  onEdit,
  onDelete,
  onViewImages,
  onRecordPayment,
  onDeletePayment,
  onEditPayment,
}) {
  const [showPayments, setShowPayments] = useState(true);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

  if (!txn) return null;

  const isPaid = txn.paymentStatus === "paid" || txn.status === "paid";
  // Support both supplier (billImages) and customer (khataPhotos) images
  const images = txn.billImages || txn.khataPhotos || [];
  const hasImages = images.length > 0;
  const payments = txn.payments || [];
  const totalAmount = Number(txn.amount) || 0;
  const paidAmount =
    Number(txn.paidAmount) || payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  const handleDeletePayment = async paymentId => {
    setDeletingPaymentId(paymentId);
    await onDeletePayment(txn.id, paymentId);
    setDeletingPaymentId(null);
    setPaymentToDelete(null);
  };

  // Get all receipt images for a payment (supports both old and new format)
  const getPaymentReceipts = payment => {
    if (payment.receiptUrls && payment.receiptUrls.length > 0) {
      return payment.receiptUrls;
    }
    if (payment.receiptUrl) {
      return [payment.receiptUrl];
    }
    return [];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 pb-14 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-slide-up max-h-[90vh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-card sm:max-w-md sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center py-3 sm:hidden">
          <div className="sheet-handle" />
        </div>

        {/* Header */}
        <div className="border-b border-border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-lg tracking-wide">Transaction Details</h3>
            <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Amount - Horizontal Layout */}
          <div className="flex items-stretch gap-3 rounded-2xl bg-muted/50 p-3">
            {/* Total Amount - Smaller */}
            <div className="flex flex-col justify-center rounded-xl bg-background/50 px-4 py-3">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p
                className={cn(
                  "font-mono text-lg font-bold",
                  isSupplier ? "text-foreground" : "text-foreground"
                )}
              >
                ₹{totalAmount.toLocaleString("en-IN")}
              </p>
            </div>

            {/* Pending Amount - Dominating */}
            <div className="flex flex-1 flex-col justify-center rounded-xl bg-background px-4 py-3">
              <p className="text-[10px] text-muted-foreground">{isPaid ? "Status" : "Pending"}</p>
              {isPaid ? (
                <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ✓ Paid
                </p>
              ) : (
                <p
                  className={cn(
                    "font-mono text-2xl font-bold",
                    isSupplier ? "amount-negative" : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  ₹{remainingAmount.toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {totalAmount > 0 && !isPaid && (
            <ProgressBar
              total={totalAmount}
              paid={paidAmount}
              size="md"
              showLabels
              className="mt-3"
            />
          )}
        </div>

        {/* Details */}
        <div className="space-y-4 px-4 py-4">
          {/* Date */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{format(parseISO(txn.date), "dd MMMM yyyy")}</p>
            </div>
          </div>

          {/* Description / Item */}
          {(txn.description || txn.itemName || txn.itemDescription) && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {isSupplier ? "Item" : "Description"}
                </p>
                <p className="font-medium">
                  {txn.description || txn.itemName || txn.itemDescription}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {txn.notes && (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm font-medium">{txn.notes}</p>
              </div>
            </div>
          )}

          {/* Quantity if available */}
          {txn.quantity && (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <span className="font-mono text-sm text-muted-foreground">#</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantity</p>
                <p className="font-medium">{txn.quantity}</p>
              </div>
            </div>
          )}

          {/* Attached Images/Bills */}
          {hasImages && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {images.length} {isSupplier ? "Bill" : "Photo"}
                  {images.length > 1 ? "s" : ""} attached
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, imgIndex) => {
                  const imgUrl = resolveImageUrl(img);
                  return (
                    <div
                      key={imgIndex}
                      onClick={() => onViewImages(images, imgIndex)}
                      className="relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-muted transition-opacity hover:opacity-90"
                    >
                      {/* Fallback shown when image fails */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`${isSupplier ? "Bill" : "Photo"} ${imgIndex + 1}`}
                        className="relative z-10 h-full w-full object-cover"
                        loading="eager"
                        onLoad={e => {
                          // Hide fallback when image loads
                          if (e.target.previousElementSibling) {
                            e.target.previousElementSibling.style.display = "none";
                          }
                        }}
                        onError={e => {
                          // Hide broken image, fallback icon will show
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Timeline */}
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowPayments(!showPayments)}
              className="flex w-full items-center justify-between text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Payment History ({payments.length})
              </span>
              {showPayments ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showPayments && (
              <div className="mt-3 space-y-2">
                {payments.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No payments recorded yet
                  </p>
                ) : (
                  [...payments]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((payment, idx) => {
                      const receipts = getPaymentReceipts(payment);
                      const hasReceipts = receipts.length > 0;

                      return (
                        <div
                          key={payment.id || idx}
                          className="group flex items-start gap-3 rounded-xl bg-muted/50 p-3"
                        >
                          {/* Payment indicator line */}
                          <div className="flex flex-col items-center pt-1">
                            <div className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                            {idx < payments.length - 1 && (
                              <div className="mt-1 min-h-[40px] w-0.5 flex-1 bg-emerald-500/30" />
                            )}
                          </div>

                          {/* Payment details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {payment.isReturn && (
                                  <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                    GR
                                  </span>
                                )}
                                <p
                                  className={cn(
                                    "font-mono font-semibold",
                                    payment.isReturn
                                      ? "text-blue-600 dark:text-blue-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  )}
                                >
                                  {payment.isReturn ? "" : "+"}₹
                                  {(Number(payment.amount) || 0).toLocaleString("en-IN")}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(payment.date), "dd MMM yyyy")}
                              </p>
                            </div>
                            {payment.notes && (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {payment.notes}
                              </p>
                            )}

                            {/* Receipt thumbnails */}
                            {hasReceipts && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {receipts.map((receipt, rIdx) => (
                                  <div
                                    key={rIdx}
                                    onClick={() => onViewImages(receipts, rIdx)}
                                    className="h-12 w-12 cursor-pointer overflow-hidden rounded-lg bg-muted transition-opacity hover:opacity-80"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={resolveImageUrl(receipt)}
                                      alt={`Receipt ${rIdx + 1}`}
                                      className="h-full w-full object-cover"
                                      loading="eager"
                                    />
                                  </div>
                                ))}
                                <div className="ml-1 self-center text-[10px] text-muted-foreground">
                                  {receipts.length} receipt{receipts.length > 1 ? "s" : ""}
                                </div>
                              </div>
                            )}

                            {/* Payment actions */}
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={() => onEditPayment?.(payment)}
                                className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs transition-colors hover:bg-accent"
                              >
                                <Pencil className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                onClick={() => setPaymentToDelete(payment)}
                                className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/20"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>

                            {/* Delete Payment Confirmation - Only show for this specific payment */}
                            {paymentToDelete?.id === payment.id && (
                              <div className="animate-slide-up mt-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                                <p className="mb-2 text-sm font-medium text-destructive">
                                  Delete payment of ₹
                                  {(Number(payment.amount) || 0).toLocaleString("en-IN")}?
                                </p>
                                <p className="mb-3 text-xs text-muted-foreground">
                                  This action cannot be undone.
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setPaymentToDelete(null)}
                                    className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-medium"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleDeletePayment(payment.id)}
                                    disabled={deletingPaymentId === payment.id}
                                    className="flex-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                                  >
                                    {deletingPaymentId === payment.id ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pb-safe space-y-2 border-t border-border px-4 py-4">
          {/* Record Payment Button - Show only if not fully paid */}
          {!isPaid && (
            <button
              onClick={() => onRecordPayment(txn)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <CreditCard className="h-5 w-5" />
              Record Payment
            </button>
          )}
          <button
            onClick={() => {
              onClose();
              onEdit(txn);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 font-medium transition-colors hover:bg-accent"
          >
            <Pencil className="h-5 w-5" />
            Edit Transaction
          </button>
          <button
            onClick={() => {
              onClose();
              onDelete(txn);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 font-medium text-destructive transition-colors hover:bg-destructive/20"
          >
            <Trash2 className="h-5 w-5" />
            Delete Transaction
          </button>
        </div>
      </div>
    </div>
  );
}

// Transaction Bubble Component with Pay Button
const TransactionBubble = React.forwardRef(function TransactionBubble(
  { txn, isSupplier, onTap, onPay, isPaid, isHighlighted },
  ref
) {
  // Support both supplier (billImages) and customer (khataPhotos) images
  const images = isSupplier ? txn.billImages : txn.khataPhotos;
  const hasImages = images?.length > 0;
  const totalAmount = Number(txn.amount) || 0;
  const paidAmount =
    Number(txn.paidAmount) ||
    (txn.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const hasPartialPayment = paidAmount > 0 && !isPaid;
  // const paidPercentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  return (
    <div
      ref={ref}
      className={cn(
        "flex justify-end transition-all duration-500",
        isHighlighted &&
          "animate-pulse rounded-2xl ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="mb-6 min-w-[240px] max-w-[85%]">
        <div
          onClick={() => onTap(txn)}
          className={cn(
            "cursor-pointer overflow-hidden rounded-2xl transition-all duration-200",
            "bg-card shadow-sm border border-border/50",
            "active:scale-[0.98]",
            "rounded-br-sm"
          )}
        >
          {/* Colored top accent bar */}
          <div
            className={cn(
              "h-1",
              isPaid ? "bg-emerald-500" : isSupplier ? "bg-rose-500" : "bg-amber-500"
            )}
          />

          <div className="p-3">
            {/* Amount Row */}
            <div className="flex items-baseline justify-between gap-4">
              {/* Total Amount */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="font-mono text-xl font-normal text-foreground">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </p>
              </div>

              {/* Pending/Paid Status */}
              <div className="text-right">
                {isPaid ? (
                  <>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Status
                    </p>
                    <p className="flex items-center justify-end gap-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      <Check className="h-4 w-4" />
                      Paid
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Pending
                    </p>
                    <p
                      className={cn(
                        "font-mono text-xl font-bold",
                        isSupplier
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-amber-600 dark:text-amber-400"
                      )}
                    >
                      ₹{remainingAmount.toLocaleString("en-IN")}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar for partial payments */}
            {hasPartialPayment && (
              <div className="mt-2">
                <ProgressBar total={totalAmount} paid={paidAmount} size="sm" />
                <p className="mt-1 text-[13px] font-bold text-muted-foreground">
                  ₹{paidAmount.toLocaleString("en-IN")} Paid
                </p>
              </div>
            )}

            {/* Divider */}
            <div className="my-2.5 border-t border-border/50" />

            {/* Description */}
            {(txn.description || txn.itemName || txn.itemDescription) && (
              <p className="line-clamp-2 text-sm font-medium text-foreground">
                {txn.description || txn.itemName || txn.itemDescription}
              </p>
            )}

            {/* Bills attached */}
            {hasImages && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" />
                <span>
                  {images.length} {isSupplier ? "bill" : "photo"}
                  {images.length > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Date */}
            <p className="mt-2 text-right text-[10px] text-muted-foreground">
              {format(parseISO(txn.date), "dd MMM yyyy")}
              {txn.createdAt && ` • ${format(parseISO(txn.createdAt), "h:mm a")}`}
            </p>
          </div>
        </div>

        {/* Pay Button - Show only if not fully paid */}
        {!isPaid && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={e => {
                e.stopPropagation();
                onPay(txn);
              }}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            >
              <CreditCard className="h-4 w-4" />
              {isSupplier ? "Pay" : "Receive"} ₹{remainingAmount.toLocaleString("en-IN")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default function PersonChatPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { type, id } = params;
  const highlightTxnId = searchParams.get("txnId");

  const scrollRef = useRef(null);
  const txnRefs = useRef({});
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTransactionDialog, setDeleteTransactionDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [billsGalleryOpen, setBillsGalleryOpen] = useState(false);
  const [highlightedTxn, setHighlightedTxn] = useState(null);
  const [profileImageViewerOpen, setProfileImageViewerOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editingPaymentTxn, setEditingPaymentTxn] = useState(null);
  const [isSubmittingPaymentEdit, setIsSubmittingPaymentEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Prevent body scroll when modals/sheets are open
  usePreventBodyScroll(
    showProfile ||
      showMenu ||
      selectedTransaction ||
      paymentFormOpen ||
      billsGalleryOpen ||
      profileImageViewerOpen
  );

  // Data hooks
  const { suppliers, loading: suppliersLoading, updateSupplier, deleteSupplier } = useSuppliers();
  const { customers, loading: customersLoading, updateCustomer, deleteCustomer } = useCustomers();
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    recordPayment: recordTransactionPayment,
    markFullPaid: markTransactionFullPaid,
    updatePayment: updateTransactionPayment,
    deletePayment: deleteTransactionPayment,
  } = useTransactions();
  const {
    udharList,
    addUdhar,
    updateUdhar,
    deleteUdhar,
    recordDeposit: recordUdharPayment,
    markFullPaid: markUdharFullPaid,
    updatePayment: updateUdharPayment,
    deletePayment: deleteUdharPayment,
  } = useUdhar();

  const isSupplier = type === "supplier";

  // Get person data
  const person = useMemo(() => {
    if (isSupplier) {
      return suppliers.find(s => s.id === id);
    }
    return customers.find(c => c.id === id);
  }, [isSupplier, suppliers, customers, id]);

  // Get transactions for this person (sorted oldest first for chat view)
  // For same-date transactions, sort by createdAt timestamp (newest at bottom)
  const personTransactions = useMemo(() => {
    const sortByDateAndTime = (a, b) => {
      // First sort by date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const dateDiff = dateA - dateB;

      if (dateDiff !== 0) return dateDiff;

      // For same date, sort by createdAt timestamp (oldest first, newest at bottom)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    };

    if (isSupplier) {
      return transactions.filter(t => t.supplierId === id).sort(sortByDateAndTime);
    }
    return udharList.filter(u => u.customerId === id).sort(sortByDateAndTime);
  }, [isSupplier, transactions, udharList, id]);

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return personTransactions;

    const query = searchQuery.toLowerCase();
    return personTransactions.filter(txn => {
      // Search in amount
      const amount = txn.amount?.toString() || "";
      if (amount.includes(query)) return true;

      // Search in description/notes
      const notes = (txn.notes || txn.itemDescription || "").toLowerCase();
      if (notes.includes(query)) return true;

      // Search in date
      const dateStr = format(parseISO(txn.date), "dd MMM yyyy").toLowerCase();
      if (dateStr.includes(query)) return true;

      // Search in payment status
      const status = (txn.paymentStatus || "").toLowerCase();
      if (status.includes(query)) return true;

      return false;
    });
  }, [personTransactions, searchQuery]);

  // Calculate totals - including partial payments
  const totals = useMemo(() => {
    const total = personTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Calculate paid amount including partial payments
    const paid = personTransactions.reduce((sum, t) => {
      if (t.paymentStatus === "paid" || t.status === "paid") {
        return sum + (Number(t.amount) || 0);
      }
      // Sum up partial payments if available
      const paidAmount =
        Number(t.paidAmount) ||
        (t.payments || []).reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
      return sum + paidAmount;
    }, 0);

    const pending = Math.max(0, total - paid);
    const progress = total > 0 ? (paid / total) * 100 : 0;

    return { total, paid, pending, progress };
  }, [personTransactions]);

  // Group transactions by date for chat view (oldest first, newest at bottom)
  const groupedByDate = useMemo(() => {
    const groups = [];
    let currentDate = null;

    filteredTransactions.forEach(txn => {
      const txnDate = parseISO(txn.date);

      if (!currentDate || !isSameDay(currentDate, txnDate)) {
        currentDate = txnDate;
        groups.push({
          date: txnDate,
          transactions: [txn],
        });
      } else {
        groups[groups.length - 1].transactions.push(txn);
      }
    });

    return groups;
  }, [filteredTransactions]);

  // Track if we've already processed the highlight to prevent re-triggering on refresh
  const highlightProcessedRef = useRef(false);

  // Scroll to highlighted transaction or bottom on load
  useEffect(() => {
    if (highlightTxnId && txnRefs.current[highlightTxnId] && !highlightProcessedRef.current) {
      // Mark as processed to prevent re-triggering
      highlightProcessedRef.current = true;

      // Scroll to the highlighted transaction
      setTimeout(() => {
        txnRefs.current[highlightTxnId]?.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedTxn(highlightTxnId);

        // Clear the URL param to prevent re-triggering on refresh
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("txnId");
        window.history.replaceState({}, "", newUrl.pathname);

        // Clear highlight after animation
        setTimeout(() => setHighlightedTxn(null), 3000);
      }, 300);
    } else if (scrollRef.current && !highlightTxnId && personTransactions.length > 0) {
      // Scroll to bottom if no highlight (newest transactions are at bottom)
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [personTransactions.length, highlightTxnId]);

  // Keep selectedTransaction in sync with updated data from personTransactions
  useEffect(() => {
    if (selectedTransaction) {
      const updatedTxn = personTransactions.find(t => t.id === selectedTransaction.id);
      if (updatedTxn) {
        // Create a simple hash of receipts to compare
        const getReceiptsHash = txn => {
          const payments = txn.payments || [];
          return payments
            .map(p => {
              const receipts = p.receiptUrls || (p.receiptUrl ? [p.receiptUrl] : []);
              return `${p.id}:${receipts.length}:${receipts.join(",")}`;
            })
            .join("|");
        };

        // Check if payment-related fields changed (including receipts)
        const paymentChanged =
          updatedTxn.paidAmount !== selectedTransaction.paidAmount ||
          updatedTxn.paymentStatus !== selectedTransaction.paymentStatus ||
          updatedTxn.status !== selectedTransaction.status ||
          (updatedTxn.payments?.length || 0) !== (selectedTransaction.payments?.length || 0) ||
          getReceiptsHash(updatedTxn) !== getReceiptsHash(selectedTransaction);

        if (paymentChanged) {
          setSelectedTransaction({ ...updatedTxn });
        }
      }
    }
  }, [personTransactions, selectedTransaction]);

  // Handle phone call
  const handleCall = useCallback(() => {
    if (person?.phone) {
      window.location.href = `tel:${person.phone}`;
    }
  }, [person?.phone]);

  // Handle UPI payment
  const handleUpiPay = useCallback(() => {
    if (person?.upiId) {
      const amount = totals.pending > 0 ? totals.pending : "";
      const upiUrl = `upi://pay?pa=${person.upiId}&pn=${encodeURIComponent(person.companyName || person.name)}&am=${amount}&cu=INR`;
      window.location.href = upiUrl;
    }
  }, [person, totals.pending]);

  // Handle GPay - Try multiple deep link schemes for better compatibility
  // const handleGPayChat = useCallback(() => {
  //   if (person?.phone) {
  //     const phone = person.phone.replace(/\D/g, "");
  //     // const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;

  //     // Try Google Pay deep link schemes
  //     // First try the newer tez:// scheme, fallback to gpay://
  //     const gpayUrl = `upi://pay?pa=${person.upiId}&am=${person.pendingAmount}&cu=INR`;

  //     // On Android, try the gpay deep link first
  //     window.location.href = gpayUrl;

  //     // Fallback after a short delay if the first one doesn't work
  //     setTimeout(() => {
  //       // If we're still here, try opening GPay with phone number for chat
  //       const phonePayUrl = `upi://pay?pa=${person.upiId}`;
  //       window.location.href = phonePayUrl;
  //     }, 1000);
  //   }
  // }, [person]);

  // Copy UPI ID
  const handleCopyUpi = useCallback(async () => {
    if (person?.upiId) {
      await navigator.clipboard.writeText(person.upiId);
      setCopiedUpi(true);
      toast.success("UPI ID copied");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  }, [person?.upiId]);

  // Track if we just added a transaction
  const justAddedRef = useRef(false);

  // Scroll to bottom helper - more reliable version
  const scrollToBottom = useCallback(() => {
    justAddedRef.current = true;
    // Use multiple attempts to ensure scroll happens after DOM update
    const doScroll = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    };
    // First attempt after short delay
    setTimeout(doScroll, 100);
    // Second attempt after longer delay (after data updates)
    setTimeout(doScroll, 500);
    // Third attempt using requestAnimationFrame for next paint
    requestAnimationFrame(() => {
      requestAnimationFrame(doScroll);
    });
  }, []);

  // Scroll to bottom when new transactions are added
  useEffect(() => {
    if (justAddedRef.current && personTransactions.length > 0) {
      justAddedRef.current = false;
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 300);
    }
  }, [personTransactions.length]);

  // Handle add transaction
  const handleAddTransaction = async data => {
    const result = await addTransaction({ ...data, supplierId: id });
    if (result.success) {
      toast.success("Transaction added");
      setTransactionFormOpen(false);
      scrollToBottom(); // Scroll to show new transaction
    } else {
      toast.error(result.error || "Failed to add");
    }
  };

  // Handle add udhar
  const handleAddUdhar = async data => {
    const result = await addUdhar({ ...data, customerId: id });
    if (result.success) {
      toast.success("Udhar added");
      setUdharFormOpen(false);
      scrollToBottom(); // Scroll to show new udhar
    } else {
      toast.error(result.error || "Failed to add");
    }
  };

  // Handle edit person
  const handleEditPerson = async data => {
    const updateFn = isSupplier ? updateSupplier : updateCustomer;
    const result = await updateFn(id, data);
    if (result.success) {
      toast.success("Updated successfully");
      setEditFormOpen(false);
    } else {
      toast.error(result.error || "Failed to update");
    }
  };

  // Handle delete person
  const handleDeletePerson = async () => {
    setIsDeleting(true); // Set before delete to prevent "not found" flash
    const deleteFn = isSupplier ? deleteSupplier : deleteCustomer;
    const result = await deleteFn(id);
    if (result.success) {
      toast.success("Deleted successfully");
      router.push("/");
    } else {
      setIsDeleting(false);
      toast.error(result.error || "Failed to delete");
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    const deleteFn = isSupplier ? deleteTransaction : deleteUdhar;
    const result = await deleteFn(transactionToDelete.id);

    if (result.success) {
      toast.success("Transaction deleted");
      setDeleteTransactionDialog(false);
      setTransactionToDelete(null);
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  // Handle transaction edit
  const handleEditTransaction = txn => {
    setEditingTransaction(txn);
    if (isSupplier) {
      setTransactionFormOpen(true);
    } else {
      setUdharFormOpen(true);
    }
  };

  // Handle view images
  const handleViewImages = (images, startIndex = 0) => {
    setViewerImages(images);
    setViewerIndex(startIndex);
    setImageViewerOpen(true);
  };

  // Handle opening payment form
  const handleOpenPaymentForm = useCallback(txn => {
    setPaymentTransaction(txn);
    setPaymentFormOpen(true);
  }, []);

  // Handle recording a payment
  const handleRecordPayment = useCallback(
    async (
      amount,
      date,
      isFullPayment = false,
      receiptImages = [],
      notes = "",
      isReturn = false
    ) => {
      if (!paymentTransaction) return;

      setIsSubmittingPayment(true);
      try {
        let result;
        // Pass receipt images as receiptUrls array
        const receiptUrl = receiptImages.length > 0 ? receiptImages : null;

        if (isSupplier) {
          if (isFullPayment) {
            result = await markTransactionFullPaid(paymentTransaction.id, receiptUrl, date);
          } else {
            result = await recordTransactionPayment(
              paymentTransaction.id,
              amount,
              receiptUrl,
              date,
              notes,
              isReturn
            );
          }
        } else {
          if (isFullPayment) {
            result = await markUdharFullPaid(paymentTransaction.id, receiptUrl, date);
          } else {
            result = await recordUdharPayment(
              paymentTransaction.id,
              amount,
              receiptUrl,
              notes,
              date,
              isReturn
            );
          }
        }

        if (result.success) {
          toast.success(isFullPayment ? "Marked as fully paid" : "Payment recorded");
          setPaymentFormOpen(false);
          setPaymentTransaction(null);
          // Keep the detail dialog open - data will refresh from React Query
        } else {
          toast.error(result.error || "Failed to record payment");
        }
      } catch (err) {
        toast.error("Failed to record payment");
      } finally {
        setIsSubmittingPayment(false);
      }
    },
    [
      paymentTransaction,
      isSupplier,
      recordTransactionPayment,
      markTransactionFullPaid,
      recordUdharPayment,
      markUdharFullPaid,
    ]
  );

  // Handle deleting a payment
  const handleDeletePayment = useCallback(
    async (txnId, paymentId) => {
      try {
        const deleteFn = isSupplier ? deleteTransactionPayment : deleteUdharPayment;
        const result = await deleteFn(txnId, paymentId);

        if (result.success) {
          toast.success("Payment deleted");
        } else {
          toast.error(result.error || "Failed to delete payment");
        }
      } catch (err) {
        toast.error("Failed to delete payment");
      }
    },
    [isSupplier, deleteTransactionPayment, deleteUdharPayment]
  );

  // Handle opening payment edit modal
  const handleOpenEditPayment = useCallback((payment, txn) => {
    setEditingPayment(payment);
    setEditingPaymentTxn(txn);
  }, []);

  // Handle saving edited payment
  const handleSavePaymentEdit = useCallback(
    async paymentUpdates => {
      if (!editingPayment || !editingPaymentTxn) return;

      const txnId = editingPaymentTxn.id;
      setIsSubmittingPaymentEdit(true);
      try {
        const updateFn = isSupplier ? updateTransactionPayment : updateUdharPayment;
        const result = await updateFn(txnId, editingPayment.id, paymentUpdates);

        if (result.success) {
          toast.success("Payment updated");
          setEditingPayment(null);
          setEditingPaymentTxn(null);

          // Wait a bit for the data to refresh, then update selectedTransaction
          setTimeout(() => {
            // Find the updated transaction from the refreshed list
            const freshTransactions = isSupplier ? transactions : udharList;
            const updatedTxn = freshTransactions.find(t => t.id === txnId);
            if (updatedTxn && selectedTransaction?.id === txnId) {
              setSelectedTransaction({ ...updatedTxn });
            }
          }, 500);
        } else {
          toast.error(result.error || "Failed to update payment");
        }
      } catch (err) {
        toast.error("Failed to update payment");
      } finally {
        setIsSubmittingPaymentEdit(false);
      }
    },
    [
      editingPayment,
      editingPaymentTxn,
      isSupplier,
      updateTransactionPayment,
      updateUdharPayment,
      selectedTransaction,
      transactions,
      udharList,
    ]
  );

  // Check loading and not found states
  const isLoading = isSupplier ? suppliersLoading : customersLoading;

  // Show loading skeleton while data is being fetched or during deletion
  if (isLoading || isDeleting) {
    return (
      <div className="flex min-h-screen flex-col">
        {/* Header Skeleton */}
        <header className="header-glass sticky top-0 z-30 border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                <div>
                  <div className="mb-1 h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            </div>
          </div>

          {/* Progress Bar Skeleton */}
          <div className="px-4 pb-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 animate-pulse bg-muted/50" />
            </div>
          </div>
        </header>

        {/* Chat Messages Skeleton */}
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {/* Date Separator */}
          <div className="flex items-center justify-center">
            <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
          </div>

          {/* Message Bubbles */}
          <div className="space-y-3">
            <div className="flex justify-end">
              <div className="h-24 w-48 animate-pulse rounded-2xl rounded-br-sm bg-muted" />
            </div>
            <div className="flex justify-end">
              <div className="h-20 w-56 animate-pulse rounded-2xl rounded-br-sm bg-muted" />
            </div>
            <div className="flex justify-end">
              <div className="h-16 w-40 animate-pulse rounded-2xl rounded-br-sm bg-muted" />
            </div>
          </div>
        </div>

        {/* Bottom Action Bar Skeleton */}
        <div className="header-glass sticky bottom-14 border-t border-border p-3">
          <div className="flex items-center gap-2">
            <div className="h-10 w-16 animate-pulse rounded-xl bg-muted" />
            <div className="h-10 w-24 animate-pulse rounded-xl bg-muted" />
            <div className="ml-auto h-12 w-12 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  // Only show "not found" when data has loaded and person doesn't exist
  if (!person) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Person not found</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="header-glass sticky top-0 z-30 border-b border-border">
        {/* Top row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="-ml-1 rounded-full p-2 transition-colors hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div
              className="flex cursor-pointer items-center gap-3 active:scale-[0.98] transition-transform"
              onClick={() => setShowProfile(true)}
            >
              <PersonAvatar
                name={person.companyName || person.name}
                image={person.profilePicture}
                size="lg"
                className="avatar-hero ring-2 ring-primary/20"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="font-heading text-lg font-semibold tracking-wide line-clamp-1 max-w-[140px]">
                    {person.companyName || person.name}
                  </p>
                  <span
                    className={cn(
                      "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      isSupplier
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {isSupplier ? "Supplier" : "Customer"}
                  </span>
                </div>
                {person.phone && (
                  <p className="text-xs text-muted-foreground font-mono">{person.phone}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {person.phone && (
              <button
                onClick={handleCall}
                className="rounded-full p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                <Phone className="h-5 w-5" />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-full p-2.5 transition-colors hover:bg-accent"
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setEditFormOpen(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setDeleteDialogOpen(true);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="animate-slide-up border-t border-border px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border-0 bg-muted pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-xs text-muted-foreground">
                {filteredTransactions.length} of {personTransactions.length} transactions
              </p>
            )}
          </div>
        )}

        {/* Summary Card */}
        <div className="px-4 pb-3">
          <div className="rounded-2xl bg-gradient-to-r from-muted/80 to-muted/40 p-4">
            {totals.total === totals.pending && totals.pending > 0 ? (
              // When total equals pending - show single prominent display
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-muted-foreground">
                    Total Amount Pending
                  </span>
                  <span
                    className={cn(
                      "font-mono text-2xl font-bold",
                      isSupplier
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    ₹{totals.total.toLocaleString("en-IN")}
                  </span>
                </div>
                <div
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  )}
                >
                  100% Pending
                </div>
              </div>
            ) : (
              // When partially paid or fully paid - show both amounts
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-muted-foreground">Total</span>
                  <span className="font-mono text-xl font-bold text-foreground">
                    ₹{totals.total.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium text-muted-foreground">
                    {totals.pending > 0 ? "Pending" : "Status"}
                  </span>
                  {totals.pending > 0 ? (
                    <span
                      className={cn(
                        "font-mono text-xl font-bold",
                        isSupplier
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-amber-600 dark:text-amber-400"
                      )}
                    >
                      ₹{totals.pending.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ All Paid
                    </span>
                  )}
                </div>
              </div>
            )}
            {/* Progress bar - only show when partially paid */}
            {totals.total !== totals.pending && totals.pending > 0 && (
              <div className="mt-3">
                <div className="progress-hero">
                  <div className="progress-hero-fill" style={{ width: `${totals.progress}%` }} />
                </div>
                <p className="mt-1.5 text-center text-[12px] text-muted-foreground">
                  Paid ₹{totals.paid.toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div
        ref={scrollRef}
        className="mb-nav flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-4 py-4"
      >
        {groupedByDate.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-20">
            {searchQuery ? (
              <>
                <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="mb-2 text-muted-foreground">No transactions found</p>
                <p className="mb-4 text-sm text-muted-foreground/70">Try a different search term</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-sm font-medium text-primary"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="mb-4 text-muted-foreground">No transactions yet</p>
                <button
                  onClick={() => {
                    setEditingTransaction(null); // Clear any editing state
                    if (isSupplier) {
                      setTransactionFormOpen(true);
                    } else {
                      setUdharFormOpen(true);
                    }
                  }}
                  className="btn-hero"
                >
                  + Add {isSupplier ? "Transaction" : "Udhar"}
                </button>
              </>
            )}
          </div>
        ) : (
          groupedByDate.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div className="mb-4 flex items-center justify-center">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {format(group.date, "dd MMM yyyy")}
                </span>
              </div>

              {/* Transaction Bubbles */}
              <div className="space-y-3">
                {group.transactions.map(txn => {
                  const isPaid = txn.paymentStatus === "paid" || txn.status === "paid";

                  return (
                    <TransactionBubble
                      key={txn.id}
                      ref={el => {
                        txnRefs.current[txn.id] = el;
                      }}
                      txn={txn}
                      isSupplier={isSupplier}
                      isPaid={isPaid}
                      isHighlighted={highlightedTxn === txn.id}
                      onTap={setSelectedTransaction}
                      onPay={handleOpenPaymentForm}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Action Bar - Fixed above nav */}
      <div className="header-glass fixed bottom-14 left-0 right-0 z-20 border-t border-border px-3 py-2">
        <div className="flex items-center gap-2">
          {/* UPI Pay Button */}
          {person.upiId && (
            <button
              onClick={handleUpiPay}
              className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <ExternalLink className="h-3 w-3" />
              Pay
            </button>
          )}

          {/* GPay Chat Button */}
          {/* {person.phone && (
            <button
              onClick={handleGPayChat}
              className="px-3 py-2 bg-muted rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <Send className="h-3 w-3" />
              Check GPay
            </button>
          )} */}

          {/* Bills Gallery Button */}

          <button
            onClick={() => setBillsGalleryOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Images className="h-3 w-3" />
            Bills
          </button>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              showSearch
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted hover:bg-accent"
            )}
          >
            <Search className="h-3 w-3" />
            Search
          </button>

          {/* PDF Export Button - Only for suppliers */}
          {isSupplier && personTransactions.length > 0 && (
            <button
              onClick={() => {
                try {
                  exportSupplierTransactionsPDF(person, personTransactions);
                  toast.success("PDF exported");
                } catch (err) {
                  toast.error("Failed to export PDF");
                }
              }}
              className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              <FileDown className="h-3 w-3" />
              PDF
            </button>
          )}

          {/* Add Transaction/Udhar */}
          <button
            onClick={() => {
              setEditingTransaction(null); // Clear any editing state
              if (isSupplier) {
                setTransactionFormOpen(true);
              } else {
                setUdharFormOpen(true);
              }
            }}
            className="ml-auto rounded-full bg-primary p-3 text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          txn={selectedTransaction}
          isSupplier={isSupplier}
          onClose={() => setSelectedTransaction(null)}
          onEdit={handleEditTransaction}
          onDelete={txn => {
            setTransactionToDelete(txn);
            setDeleteTransactionDialog(true);
          }}
          onViewImages={handleViewImages}
          onRecordPayment={handleOpenPaymentForm}
          onEditPayment={payment => handleOpenEditPayment(payment, selectedTransaction)}
          onDeletePayment={handleDeletePayment}
        />
      )}

      {/* Payment Form Modal */}
      {paymentFormOpen && paymentTransaction && (
        <PaymentFormModal
          txn={paymentTransaction}
          onClose={() => {
            setPaymentFormOpen(false);
            setPaymentTransaction(null);
          }}
          onSubmit={handleRecordPayment}
          isSubmitting={isSubmittingPayment}
        />
      )}

      {/* Edit Payment Modal */}
      {editingPayment && editingPaymentTxn && (
        <EditPaymentModal
          payment={editingPayment}
          txn={editingPaymentTxn}
          onClose={() => {
            setEditingPayment(null);
            setEditingPaymentTxn(null);
          }}
          onSave={handleSavePaymentEdit}
          isSubmitting={isSubmittingPaymentEdit}
        />
      )}

      {/* Bills Gallery Modal */}
      {billsGalleryOpen && (
        <BillsGalleryModal
          transactions={personTransactions}
          onClose={() => setBillsGalleryOpen(false)}
          onViewImages={handleViewImages}
        />
      )}

      {/* Profile Sheet */}
      {showProfile && (
        <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setShowProfile(false)}>
          <div
            className="animate-slide-up absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-3xl bg-card"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="sheet-handle" />
            </div>

            {/* Avatar & Name */}
            <div className="flex flex-col items-center py-6">
              <div
                className={cn(
                  "group relative cursor-pointer",
                  person.profilePicture && "transition-opacity hover:opacity-90"
                )}
                onClick={() => {
                  if (person.profilePicture) {
                    setProfileImageViewerOpen(true);
                  }
                }}
              >
                <PersonAvatar
                  name={person.companyName || person.name}
                  image={person.profilePicture}
                  size="xl"
                  className="avatar-hero"
                />
                {person.profilePicture && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/30">
                    <Expand className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                )}
              </div>
              <h2 className="mt-4 font-heading text-2xl tracking-wide">
                {person.companyName || person.name}
              </h2>
              {person.name && person.companyName && (
                <p className="text-sm text-muted-foreground">{person.name}</p>
              )}
              {/* Type badge */}
              <span
                className={cn(
                  "mt-2 rounded-full px-3 py-1 text-xs font-medium",
                  isSupplier ? "badge-supplier" : "badge-customer"
                )}
              >
                {isSupplier ? "Supplier" : "Customer"}
              </span>
            </div>

            {/* Contact Info */}
            <div className="pb-nav space-y-3 px-4">
              {/* Phone */}
              {person.phone && (
                <div className="flex items-center justify-between rounded-xl bg-muted p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Phone number</p>
                    <p className="font-mono">{person.phone}</p>
                  </div>
                  <button
                    onClick={handleCall}
                    className="rounded-full bg-primary/20 p-2 text-primary"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* UPI ID */}
              {person.upiId && (
                <div className="flex items-center justify-between rounded-xl bg-muted p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">UPI ID</p>
                    <p className="font-mono text-sm">{person.upiId}</p>
                  </div>
                  <button
                    onClick={handleCopyUpi}
                    className="rounded-full bg-primary/20 p-2 text-primary"
                  >
                    {copiedUpi ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                {person.upiId && (
                  <button
                    onClick={handleUpiPay}
                    className="btn-hero flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Pay via UPI
                  </button>
                )}
                {/* {person.phone && (
                  <button
                    onClick={handleGPayChat}
                    className="p-4 bg-muted rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-accent transition-colors"
                  >
                    <Send className="h-5 w-5" />
                    Open GPay
                  </button>
                )} */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forms */}
      {isSupplier ? (
        <>
          <SupplierForm
            open={editFormOpen}
            onOpenChange={setEditFormOpen}
            onSubmit={handleEditPerson}
            initialData={person}
            title="Edit Supplier"
          />
          <TransactionForm
            open={transactionFormOpen}
            onOpenChange={open => {
              setTransactionFormOpen(open);
              if (!open) setEditingTransaction(null);
            }}
            onSubmit={
              editingTransaction
                ? data =>
                    updateTransaction(editingTransaction.id, data).then(r => {
                      if (r.success) {
                        toast.success("Updated");
                        setTransactionFormOpen(false);
                        setEditingTransaction(null);
                      }
                      return r;
                    })
                : handleAddTransaction
            }
            suppliers={suppliers}
            defaultSupplierId={id}
            initialData={editingTransaction || null}
            title="Add Transaction"
          />
        </>
      ) : (
        <>
          <CustomerForm
            open={editFormOpen}
            onOpenChange={setEditFormOpen}
            onSubmit={handleEditPerson}
            initialData={person}
            title="Edit Customer"
          />
          <UdharForm
            open={udharFormOpen}
            onOpenChange={open => {
              setUdharFormOpen(open);
              if (!open) setEditingTransaction(null);
            }}
            onSubmit={
              editingTransaction
                ? data =>
                    updateUdhar(editingTransaction.id, data).then(r => {
                      if (r.success) {
                        toast.success("Updated");
                        setUdharFormOpen(false);
                        setEditingTransaction(null);
                      }
                      return r;
                    })
                : handleAddUdhar
            }
            customers={customers}
            defaultCustomerId={id}
            initialData={editingTransaction || null}
            title="Add Udhar"
          />
        </>
      )}

      {/* Delete Person Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeletePerson}
        title={`Delete ${isSupplier ? "Supplier" : "Customer"}`}
        description={`Are you sure you want to delete "${person.companyName || person.name}"? This will also delete all associated transactions.`}
      />

      {/* Delete Transaction Confirmation */}
      <DeleteConfirmDialog
        open={deleteTransactionDialog}
        onOpenChange={setDeleteTransactionDialog}
        onConfirm={handleDeleteTransaction}
        title="Delete Transaction"
        description={
          transactionToDelete
            ? `Delete transaction of ₹${Number(transactionToDelete.amount).toLocaleString("en-IN")}?`
            : ""
        }
      />

      {/* Image Viewer */}
      <ImageGalleryViewer
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        images={viewerImages}
        initialIndex={viewerIndex}
      />

      {/* Profile Image Viewer */}
      {person?.profilePicture && (
        <ImageViewer
          src={resolveImageUrl(person.profilePicture)}
          alt={person.companyName || person.name}
          open={profileImageViewerOpen}
          onOpenChange={setProfileImageViewerOpen}
        />
      )}
    </div>
  );
}
