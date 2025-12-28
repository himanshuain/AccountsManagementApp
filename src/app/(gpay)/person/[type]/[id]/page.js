"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, Phone, MoreVertical, Send, Plus, 
  Copy, ExternalLink, Check, Pencil, Trash2, X,
  Receipt, Image as ImageIcon, Calendar, FileText, CreditCard,
  Clock, ChevronDown, ChevronUp, IndianRupee, Images, FileDown, Camera, ImagePlus, Expand
} from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { toast } from "sonner";

import { useSuppliers } from "@/hooks/useSuppliers";
import { useCustomers } from "@/hooks/useCustomers";
import { useTransactions } from "@/hooks/useTransactions";
import { useUdhar } from "@/hooks/useUdhar";

import { PersonAvatar } from "@/components/gpay/PersonAvatar";
import { TransactionForm } from "@/components/TransactionForm";
import { UdharForm } from "@/components/UdharForm";
import { SupplierForm } from "@/components/SupplierForm";
import { CustomerForm } from "@/components/CustomerForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ImageGalleryViewer, ImageViewer } from "@/components/ImageViewer";
import { ProgressBar } from "@/components/gpay/PaymentProgress";
import { resolveImageUrl, getImageUrls, isDataUrl } from "@/lib/image-url";
import { exportSupplierTransactionsPDF } from "@/lib/export";
import { compressImage } from "@/lib/image-compression";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// Hook to prevent body scroll when modal is open
function usePreventBodyScroll(isOpen) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);
}

// Payment Form Modal Component with image upload
function PaymentFormModal({ 
  txn, 
  onClose, 
  onSubmit,
  isSubmitting 
}) {
  const today = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [receiptImages, setReceiptImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const remainingAmount = (Number(txn.amount) || 0) - (Number(txn.paidAmount) || 0);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 5 - receiptImages.length;
    const filesToUpload = files.slice(0, remainingSlots);
    
    setIsUploading(true);
    const newImages = [];

    for (const file of filesToUpload) {
      try {
        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
          maxSizeKB: 500,
        });

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
            // Fallback to local preview
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

  const handleRemoveImage = (index) => {
    setReceiptImages(receiptImages.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const paymentAmount = Number(amount);
    if (paymentAmount <= 0) {
      toast.error("Enter valid amount");
      return;
    }
    if (paymentAmount > remainingAmount) {
      toast.error(`Max amount is ₹${remainingAmount.toLocaleString("en-IN")}`);
      return;
    }
    onSubmit(paymentAmount, date, false, receiptImages);
  };

  const handleFullPayment = () => {
    onSubmit(remainingAmount, date, true, receiptImages);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl animate-slide-up max-h-[90vh] overflow-y-auto overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center py-3 sm:hidden sticky top-0 bg-card">
          <div className="sheet-handle" />
        </div>

        <div className="px-4 pb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading tracking-wide">Record Payment</h3>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Remaining Amount */}
          <div className="text-center py-4 bg-muted rounded-xl mb-4">
            <p className="text-xs text-muted-foreground mb-1">Pending Amount</p>
            <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              ₹{remainingAmount.toLocaleString("en-IN")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Payment Amount</label>
              <div className="relative">
                <IndianRupee className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="input-hero pl-12 text-lg font-mono"
                  autoFocus
                />
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Payment Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today}
                className="input-hero"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 flex-wrap">
              {[1000, 5000, 10000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(Math.min(val, remainingAmount)))}
                  className="px-3 py-1.5 bg-muted rounded-full text-sm font-mono hover:bg-accent transition-colors"
                >
                  ₹{val.toLocaleString("en-IN")}
                </button>
              ))}
            </div>

            {/* Receipt Images Upload */}
            <div>
              <label className="text-sm text-muted-foreground block mb-2">Payment Receipts (optional)</label>
              
              {/* Hidden inputs */}
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

              {/* Image Grid */}
              <div className="flex gap-2 flex-wrap">
                {receiptImages.map((img, idx) => {
                  const urls = getImageUrls(img);
                  const displayUrl = isDataUrl(img) ? img : (urls.thumbnail || urls.src);
                  return (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted group">
                      <img src={displayUrl} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
                
                {receiptImages.length < 5 && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-0.5 hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {isUploading ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-0.5 hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">Gallery</span>
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{receiptImages.length}/5 images</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 pb-safe">
              <button
                type="submit"
                disabled={isSubmitting || !amount || isUploading}
                className="flex-1 btn-hero disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Record Payment"}
              </button>
              <button
                type="button"
                onClick={handleFullPayment}
                disabled={isSubmitting || isUploading}
                className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                Pay Full
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Bills Gallery Modal
function BillsGalleryModal({ transactions, onClose, onViewImages }) {
  const allBills = useMemo(() => {
    const bills = [];
    transactions.forEach(txn => {
      if (txn.billImages?.length > 0) {
        txn.billImages.forEach((img, idx) => {
          bills.push({
            url: img,
            txnId: txn.id,
            txnAmount: txn.amount,
            txnDate: txn.date,
            txnDescription: txn.description || txn.itemName,
            index: idx,
          });
        });
      }
    });
    return bills;
  }, [transactions]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-2xl bg-card rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-hidden animate-slide-up flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center py-3 sm:hidden">
          <div className="sheet-handle" />
        </div>

        <div className="px-4 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-heading tracking-wide">All Bills & Receipts</h3>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{allBills.length} image{allBills.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-safe">
          {allBills.length === 0 ? (
            <div className="text-center py-12">
              <Images className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bills attached yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allBills.map((bill, idx) => (
                <div
                  key={`${bill.txnId}-${bill.index}`}
                  onClick={() => {
                    const txn = transactions.find(t => t.id === bill.txnId);
                    if (txn?.billImages) {
                      onViewImages(txn.billImages, bill.index);
                    }
                  }}
                  className="relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(bill.url)}
                    alt={`Bill ${idx + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {/* Overlay with info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <p className="text-white text-xs font-mono">₹{Number(bill.txnAmount).toLocaleString("en-IN")}</p>
                    <p className="text-white/70 text-[10px]">{format(parseISO(bill.txnDate), "dd MMM yyyy")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
  onDeletePayment 
}) {
  const [showPayments, setShowPayments] = useState(true);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  if (!txn) return null;
  
  const isPaid = txn.paymentStatus === "paid" || txn.status === "paid";
  const hasImages = txn.billImages?.length > 0;
  const payments = txn.payments || [];
  const totalAmount = Number(txn.amount) || 0;
  const paidAmount = Number(txn.paidAmount) || payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  const handleDeletePayment = async (paymentId) => {
    setDeletingPaymentId(paymentId);
    await onDeletePayment(txn.id, paymentId);
    setDeletingPaymentId(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-14"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto overscroll-contain animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center py-3 sm:hidden">
          <div className="sheet-handle" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading tracking-wide">Transaction Details</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Amount */}
          <div className="text-center py-4">
            <p className={cn(
              "text-4xl font-bold font-mono",
              isSupplier ? "amount-negative" : "text-amber-600 dark:text-amber-400"
            )}>
              ₹{totalAmount.toLocaleString("en-IN")}
            </p>
            <span className={cn(
              "inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium",
              isPaid ? "badge-paid" : "badge-pending"
            )}>
              {isPaid ? "✓ Paid" : `⏳ ₹${remainingAmount.toLocaleString("en-IN")} Pending`}
            </span>
          </div>

          {/* Progress Bar */}
          {totalAmount > 0 && (
            <ProgressBar total={totalAmount} paid={paidAmount} size="md" showLabels className="mt-4" />
          )}
        </div>

        {/* Details */}
        <div className="px-4 py-4 space-y-4">
          {/* Date */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{format(parseISO(txn.date), "dd MMMM yyyy, h:mm a")}</p>
            </div>
          </div>

          {/* Description */}
          {(txn.description || txn.itemName) && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="font-medium">{txn.description || txn.itemName}</p>
              </div>
            </div>
          )}

          {/* Quantity if available */}
          {txn.quantity && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground font-mono text-sm">#</span>
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
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {txn.billImages.length} Bill{txn.billImages.length > 1 ? "s" : ""} / Receipt{txn.billImages.length > 1 ? "s" : ""} attached
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {txn.billImages.map((img, imgIndex) => (
                  <div
                    key={imgIndex}
                    onClick={() => onViewImages(txn.billImages, imgIndex)}
                    className="relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveImageUrl(img)}
                      alt={`Bill ${imgIndex + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Timeline */}
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowPayments(!showPayments)}
              className="w-full flex items-center justify-between text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Payment History ({payments.length})
              </span>
              {showPayments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showPayments && (
              <div className="mt-3 space-y-2">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No payments recorded yet</p>
                ) : (
                  payments.map((payment, idx) => (
                    <div 
                      key={payment.id || idx}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl group"
                    >
                      {/* Payment indicator line */}
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                        {idx < payments.length - 1 && (
                          <div className="w-0.5 h-8 bg-emerald-500/30 mt-1" />
                        )}
                      </div>

                      {/* Payment details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            +₹{(Number(payment.amount) || 0).toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(payment.date), "dd MMM yyyy")}
                          </p>
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground truncate">{payment.notes}</p>
                        )}
                        
                        {/* Payment actions */}
                        <div className="flex items-center gap-2 mt-2">
                          {payment.receiptUrl && (
                            <button
                              onClick={() => onViewImages([payment.receiptUrl], 0)}
                              className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1"
                            >
                              <Receipt className="h-3 w-3" />
                              View Receipt
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            disabled={deletingPaymentId === payment.id}
                            className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded-full flex items-center gap-1 hover:bg-destructive/20 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            {deletingPaymentId === payment.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-4 border-t border-border space-y-2 pb-safe">
          {/* Record Payment Button - Show only if not fully paid */}
          {!isPaid && (
            <button
              onClick={() => {
                onClose();
                onRecordPayment(txn);
              }}
              className="w-full px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
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
            className="w-full px-4 py-3 bg-muted rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-accent transition-colors"
          >
            <Pencil className="h-5 w-5" />
            Edit Transaction
          </button>
          <button
            onClick={() => {
              onClose();
              onDelete(txn);
            }}
            className="w-full px-4 py-3 bg-destructive/10 text-destructive rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
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
const TransactionBubble = React.forwardRef(function TransactionBubble({ 
  txn, 
  isSupplier, 
  onTap,
  onPay,
  isPaid,
  isHighlighted
}, ref) {
  const hasImages = txn.billImages?.length > 0;
  const totalAmount = Number(txn.amount) || 0;
  const paidAmount = Number(txn.paidAmount) || (txn.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const hasPartialPayment = paidAmount > 0 && !isPaid;

  return (
    <div ref={ref} className={cn(
      "flex justify-end transition-all duration-500",
      isHighlighted && "animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl"
    )}>
      <div className="min-w-[250px] max-w-[85%] mb-8">
        <div
          onClick={() => onTap(txn)}
          className={cn(
            "rounded-2xl p-3 cursor-pointer transition-all duration-200",
            "active:scale-[0.98] bubble-hero",
             "bubble-incoming rounded-bl-sm border-l-4 border-l-emerald-500", isPaid ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-amber-500",
          )}
        >
          {/* Amount with receipt icon */}
          <div className="flex items-center gap-2">
            <p className={cn(
              "text-xl font-bold font-mono",
              isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            )}>
              ₹{totalAmount.toLocaleString("en-IN")}
            </p>
           
          </div>
          
          {/* Description */}
          {(txn.description || txn.itemName) && (
            <p className="text-sm mt-1 line-clamp-2">
              {txn.description || txn.itemName}
            </p>
          )}

          {/* Preview image if available */}
          {hasImages && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted">
              <Receipt className="h-4 w-4 text-primary opacity-90" />
              <span>{txn.billImages.length} image{txn.billImages.length > 1 ? "s" : ""}</span>
            </div>
          )}

          {/* Progress bar for partial payments */}
          {hasPartialPayment && (
            <div className="mt-2">
              <ProgressBar total={totalAmount} paid={paidAmount} size="sm" />
              <p className="text-[10px] mt-1">
                ₹{paidAmount.toLocaleString("en-IN")} paid • ₹{remainingAmount.toLocaleString("en-IN")} left
              </p>
            </div>
          )}
          
          {/* Footer with date and time */}
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              isPaid ? "badge-paid" : "badge-pending"
            )}>
              {isPaid ? isSupplier ? "Paid" : "Received" : "Pending"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {format(parseISO(txn.date), "dd MMM")}
              {txn.createdAt && `, ${format(parseISO(txn.createdAt), "h:mm a")}`}
            </span>
          </div>
        </div>

        {/* Pay Button - Show only if not fully paid */}
        {!isPaid && (
          <div className="flex justify-end mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPay(txn);
              }}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-full flex items-center gap-1.5 hover:bg-emerald-700 transition-colors active:scale-95"
            >
              <CreditCard className="h-3 w-3" />
              Pay ₹{remainingAmount.toLocaleString("en-IN")}
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

  // Prevent body scroll when modals/sheets are open
  usePreventBodyScroll(showProfile || showMenu || selectedTransaction || paymentFormOpen || billsGalleryOpen || profileImageViewerOpen);

  // Data hooks
  const { suppliers, updateSupplier, deleteSupplier } = useSuppliers();
  const { customers, updateCustomer, deleteCustomer } = useCustomers();
  const { 
    transactions, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction,
    recordPayment: recordTransactionPayment,
    markFullPaid: markTransactionFullPaid,
    deletePayment: deleteTransactionPayment
  } = useTransactions();
  const { 
    udharList, 
    addUdhar, 
    updateUdhar, 
    deleteUdhar,
    recordDeposit: recordUdharPayment,
    markFullPaid: markUdharFullPaid,
    deletePayment: deleteUdharPayment
  } = useUdhar();

  const isSupplier = type === "supplier";

  // Get person data
  const person = useMemo(() => {
    if (isSupplier) {
      return suppliers.find(s => s.id === id);
    }
    return customers.find(c => c.id === id);
  }, [isSupplier, suppliers, customers, id]);

  // Get transactions for this person
  const personTransactions = useMemo(() => {
    if (isSupplier) {
      return transactions
        .filter(t => t.supplierId === id)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return udharList
      .filter(u => u.customerId === id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [isSupplier, transactions, udharList, id]);

  // Calculate totals - including partial payments
  const totals = useMemo(() => {
    const total = personTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    // Calculate paid amount including partial payments
    const paid = personTransactions.reduce((sum, t) => {
      if (t.paymentStatus === "paid" || t.status === "paid") {
        return sum + (Number(t.amount) || 0);
      }
      // Sum up partial payments if available
      const paidAmount = Number(t.paidAmount) || (t.payments || []).reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
      return sum + paidAmount;
    }, 0);
    
    const pending = Math.max(0, total - paid);
    const progress = total > 0 ? (paid / total) * 100 : 0;
    
    return { total, paid, pending, progress };
  }, [personTransactions]);

  // Group transactions by date for chat view
  const groupedByDate = useMemo(() => {
    const groups = [];
    let currentDate = null;
    
    personTransactions.forEach(txn => {
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
  }, [personTransactions]);

  // Scroll to highlighted transaction or bottom on load
  useEffect(() => {
    if (highlightTxnId && txnRefs.current[highlightTxnId]) {
      // Scroll to the highlighted transaction
      setTimeout(() => {
        txnRefs.current[highlightTxnId]?.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedTxn(highlightTxnId);
        // Clear highlight after animation
        setTimeout(() => setHighlightedTxn(null), 3000);
      }, 300);
    } else if (scrollRef.current && !highlightTxnId) {
      // Scroll to bottom if no highlight
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [personTransactions.length, highlightTxnId]);

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
  const handleGPayChat = useCallback(() => {
    if (person?.phone) {
      const phone = person.phone.replace(/\D/g, "");
      const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;
      
      // Try Google Pay deep link schemes
      // First try the newer tez:// scheme, fallback to gpay://
      const gpayUrl = `gpay://upi/transaction?pa=&pn=${encodeURIComponent(person.companyName || person.name)}&mc=0000&mode=02&purpose=00`;
      const tezUrl = `tez://upi/pay?pa=&pn=${encodeURIComponent(person.companyName || person.name)}&mc=0000&mode=02&purpose=00`;
      
      // For opening GPay to a contact, we use the intent URL format
      // Try multiple schemes for cross-device compatibility
      const intentUrl = `intent://pay#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
      
      // On Android, try the gpay deep link first
      window.location.href = tezUrl;
      
      // Fallback after a short delay if the first one doesn't work
      setTimeout(() => {
        // If we're still here, try opening GPay with phone number for chat
        const phonePayUrl = `upi://pay?pa=&pn=${encodeURIComponent(person.companyName || person.name)}&mc=0000&mode=02&purpose=00`;
        window.location.href = phonePayUrl;
      }, 1000);
    }
  }, [person]);

  // Copy UPI ID
  const handleCopyUpi = useCallback(async () => {
    if (person?.upiId) {
      await navigator.clipboard.writeText(person.upiId);
      setCopiedUpi(true);
      toast.success("UPI ID copied");
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  }, [person?.upiId]);

  // Handle add transaction
  const handleAddTransaction = async (data) => {
    const result = await addTransaction({ ...data, supplierId: id });
    if (result.success) {
      toast.success("Transaction added");
      setTransactionFormOpen(false);
    } else {
      toast.error(result.error || "Failed to add");
    }
  };

  // Handle add udhar
  const handleAddUdhar = async (data) => {
    const result = await addUdhar({ ...data, customerId: id });
    if (result.success) {
      toast.success("Udhar added");
      setUdharFormOpen(false);
    } else {
      toast.error(result.error || "Failed to add");
    }
  };

  // Handle edit person
  const handleEditPerson = async (data) => {
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
    const deleteFn = isSupplier ? deleteSupplier : deleteCustomer;
    const result = await deleteFn(id);
    if (result.success) {
      toast.success("Deleted successfully");
      router.push("/");
    } else {
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
  const handleEditTransaction = (txn) => {
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
  const handleOpenPaymentForm = useCallback((txn) => {
    setPaymentTransaction(txn);
    setPaymentFormOpen(true);
  }, []);

  // Handle recording a payment
  const handleRecordPayment = useCallback(async (amount, date, isFullPayment = false, receiptImages = []) => {
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
          result = await recordTransactionPayment(paymentTransaction.id, amount, receiptUrl, date);
        }
      } else {
        if (isFullPayment) {
          result = await markUdharFullPaid(paymentTransaction.id, receiptUrl, date);
        } else {
          result = await recordUdharPayment(paymentTransaction.id, amount, receiptUrl, null, date);
        }
      }

      if (result.success) {
        toast.success(isFullPayment ? "Marked as fully paid" : "Payment recorded");
        setPaymentFormOpen(false);
        setPaymentTransaction(null);
      } else {
        toast.error(result.error || "Failed to record payment");
      }
    } catch (err) {
      toast.error("Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  }, [paymentTransaction, isSupplier, recordTransactionPayment, markTransactionFullPaid, recordUdharPayment, markUdharFullPaid]);

  // Handle deleting a payment
  const handleDeletePayment = useCallback(async (txnId, paymentId) => {
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
  }, [isSupplier, deleteTransactionPayment, deleteUdharPayment]);

  if (!person) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Person not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border">
        {/* Top row */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-1 rounded-full hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setShowProfile(true)}
            >
              <PersonAvatar
                name={person.companyName || person.name}
                image={person.profilePicture}
                size="md"
                className="avatar-hero"
              />
              <div>
                <p className="font-heading text-lg tracking-wide">
                  {person.companyName || person.name}
                </p>
                {person.phone && (
                  <p className="text-xs text-muted-foreground">{person.phone}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {person.phone && (
              <button
                onClick={handleCall}
                className="p-2 rounded-full hover:bg-accent transition-colors"
              >
                <Phone className="h-5 w-5" />
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-full hover:bg-accent transition-colors"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowMenu(false)} 
                  />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-card rounded-xl shadow-lg z-50 py-1 overflow-hidden border border-border">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setEditFormOpen(true);
                      }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-accent transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setDeleteDialogOpen(true);
                      }}
                      className="w-full px-4 py-3 text-left text-destructive flex items-center gap-3 hover:bg-destructive/10 transition-colors"
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

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Total: <span className="font-mono font-semibold text-foreground">₹{totals.total.toLocaleString("en-IN")}</span>
            </span>
            <span className={cn(
              "font-mono font-medium",
              totals.pending > 0 ? "status-pending" : "status-paid"
            )}>
              {totals.pending > 0 ? `₹${totals.pending.toLocaleString("en-IN")} pending` : "✓ All paid"}
            </span>
          </div>
          <div className="progress-hero">
            <div 
              className="progress-hero-fill"
              style={{ width: `${totals.progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-6 mb-nav"
      >
        {groupedByDate.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <p className="text-muted-foreground mb-4">No transactions yet</p>
            <button
              onClick={() => isSupplier ? setTransactionFormOpen(true) : setUdharFormOpen(true)}
              className="btn-hero"
            >
              + Add {isSupplier ? "Transaction" : "Udhar"}
            </button>
          </div>
        ) : (
          groupedByDate.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Separator */}
              <div className="flex items-center justify-center mb-4">
                <span className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground font-medium">
                  {format(group.date, "dd MMM yyyy")}
                </span>
              </div>

              {/* Transaction Bubbles */}
              <div className="space-y-3">
                {group.transactions.map((txn) => {
                  const isPaid = txn.paymentStatus === "paid" || txn.status === "paid";
                  
                  return (
                    <TransactionBubble
                      key={txn.id}
                      ref={el => { txnRefs.current[txn.id] = el; }}
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
      <div className="fixed bottom-14 left-0 right-0 bg-background border-t border-border px-3 py-2 z-20">
        <div className="flex items-center gap-2">
          {/* UPI Pay Button */}
          {person.upiId && (
            <button
              onClick={handleUpiPay}
              className="px-3 py-2 bg-muted rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Pay
            </button>
          )}
          
          {/* GPay Chat Button */}
          {person.phone && (
            <button
              onClick={handleGPayChat}
              className="px-3 py-2 bg-muted rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <Send className="h-3 w-3" />
              Check GPay
            </button>
          )}

          {/* Bills Gallery Button */}
          {personTransactions.length > 0 && (
            <button
              onClick={() => setBillsGalleryOpen(true)}
              className="px-3 py-2 bg-muted rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <Images className="h-3 w-3" />
              Bills ({personTransactions.length > 0 ? personTransactions.length-1 : 0})
            </button>
          )}

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
              className="px-3 py-2 bg-muted rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <FileDown className="h-3 w-3" />
              PDF
            </button>
          )}
          
          {/* Add Transaction/Udhar */}
          <button
            onClick={() => isSupplier ? setTransactionFormOpen(true) : setUdharFormOpen(true)}
            className="ml-auto p-3 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
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
          onDelete={(txn) => {
            setTransactionToDelete(txn);
            setDeleteTransactionDialog(true);
          }}
          onViewImages={handleViewImages}
          onRecordPayment={handleOpenPaymentForm}
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
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[80vh] overflow-y-auto overscroll-contain overflow-x-hidden animate-slide-up"
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
                  "relative group cursor-pointer",
                  person.profilePicture && "hover:opacity-90 transition-opacity"
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
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-full transition-colors">
                    <Expand className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
              <h2 className="mt-4 text-2xl font-heading tracking-wide">
                {person.companyName || person.name}
              </h2>
              {person.name && person.companyName && (
                <p className="text-sm text-muted-foreground">{person.name}</p>
              )}
              {/* Type badge */}
              <span className={cn(
                "mt-2 px-3 py-1 rounded-full text-xs font-medium",
                isSupplier ? "badge-supplier" : "badge-customer"
              )}>
                {isSupplier ? "Supplier" : "Customer"}
              </span>
            </div>

            {/* Contact Info */}
            <div className="px-4 pb-nav space-y-3">
              {/* Phone */}
              {person.phone && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="text-xs text-muted-foreground">Phone number</p>
                    <p className="font-mono">{person.phone}</p>
                  </div>
                  <button
                    onClick={handleCall}
                    className="p-2 rounded-full bg-primary/20 text-primary"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* UPI ID */}
              {person.upiId && (
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
                  <div>
                    <p className="text-xs text-muted-foreground">UPI ID</p>
                    <p className="font-mono text-sm">{person.upiId}</p>
                  </div>
                  <button
                    onClick={handleCopyUpi}
                    className="p-2 rounded-full bg-primary/20 text-primary"
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
                {person.phone && (
                  <button
                    onClick={handleGPayChat}
                    className="p-4 bg-muted rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-accent transition-colors"
                  >
                    <Send className="h-5 w-5" />
                    Open GPay
                  </button>
                )}
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
            onOpenChange={(open) => {
              setTransactionFormOpen(open);
              if (!open) setEditingTransaction(null);
            }}
            onSubmit={editingTransaction 
              ? (data) => updateTransaction(editingTransaction.id, data).then(r => {
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
            initialData={editingTransaction ? { ...editingTransaction, supplierId: id } : { supplierId: id }}
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
            onOpenChange={(open) => {
              setUdharFormOpen(open);
              if (!open) setEditingTransaction(null);
            }}
            onSubmit={editingTransaction
              ? (data) => updateUdhar(editingTransaction.id, data).then(r => {
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
            initialData={editingTransaction ? { ...editingTransaction, customerId: id } : { customerId: id }}
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
        description={transactionToDelete ? `Delete transaction of ₹${Number(transactionToDelete.amount).toLocaleString("en-IN")}?` : ""}
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
