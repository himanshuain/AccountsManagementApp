"use client";

import { useState, useRef, useCallback } from "react";
import {
  X,
  IndianRupee,
  Camera,
  ImagePlus,
  Expand,
  Wallet,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getImageUrls, isDataUrl } from "@/lib/image-url";
import { compressImage, compressForHD } from "@/lib/image-compression";
import {
  PhotoGalleryViewer as ImageGalleryViewer,
} from "@/components/PhotoViewer";

function ReceiptThumbnail({ src, idx, onTap, onRemove }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="group relative h-16 w-16 overflow-hidden rounded-lg bg-muted">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Receipt ${idx + 1}`}
        className={cn(
          "h-full w-full cursor-pointer object-cover transition-opacity",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onClick={() => onTap(idx)}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(idx);
        }}
        className="absolute right-0.5 top-0.5 rounded-full bg-destructive p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
      {loaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
          <Expand className="h-4 w-4 text-white opacity-0 group-hover:opacity-70" />
        </div>
      )}
    </div>
  );
}

/**
 * Lumpsum Payment Drawer
 *
 * Renders a compact trigger button + a bottom sheet drawer.
 * The trigger button is meant to be placed inline (e.g. in a bottom bar).
 */
export function LumpsumPaymentDrawer({
  type = "supplier",
  totalPending = 0,
  pendingItems = [],
  onPayBills,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [receiptImages, setReceiptImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isHDMode, setIsHDMode] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const resetForm = useCallback(() => {
    setAmount("");
    setReceiptImages([]);
    setIsUploading(false);
    setIsSubmitting(false);
  }, []);

  const handleOpen = () => {
    if (disabled) {
      toast.error("Cannot pay while offline");
      return;
    }
    if (totalPending <= 0) {
      toast.info("No pending amount");
      return;
    }
    resetForm();
    setOpen(true);
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 5 - receiptImages.length;
    const filesToUpload = files.slice(0, remainingSlots);

    setIsUploading(true);
    const newImages = [];

    for (const file of filesToUpload) {
      try {
        let compressedFile;
        if (isHDMode) {
          compressedFile = await compressForHD(file);
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
            const localUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve(ev.target.result);
              reader.readAsDataURL(compressedFile);
            });
            newImages.push(localUrl);
          }
        } catch {
          const localUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(compressedFile);
          });
          newImages.push(localUrl);
        }
      } catch (error) {
        console.error("File processing failed:", error);
      }
    }

    setReceiptImages((prev) => [...prev, ...newImages]);
    setIsUploading(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleRemoveImage = (index) => {
    setReceiptImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageTap = (index) => {
    setViewerIndex(index);
    setImageViewerOpen(true);
  };

  const parsedAmount = Number(amount) || 0;
  const isOverLimit = parsedAmount > totalPending;
  const isValidAmount = parsedAmount > 0 && !isOverLimit;

  const handleSubmit = async () => {
    if (parsedAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (isOverLimit) {
      toast.error(`Amount cannot exceed ₹${totalPending.toLocaleString("en-IN")}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const lumpsumTag = `Paid in Lumpsum of ₹${parsedAmount.toLocaleString("en-IN")}`;
      const payments = [];
      let remaining = parsedAmount;

      for (const item of pendingItems) {
        if (remaining <= 0) break;

        const itemPending = item.pendingAmount;
        if (itemPending <= 0) continue;

        const payAmount = Math.min(remaining, itemPending);
        remaining -= payAmount;

        payments.push({
          id: item.id,
          amount: payAmount,
          receiptUrls: receiptImages.length > 0 ? receiptImages : null,
          notes: lumpsumTag,
        });
      }

      if (payments.length === 0) {
        toast.error("No pending bills to pay");
        setIsSubmitting(false);
        return;
      }

      await onPayBills(payments);

      const paidCount = payments.length;
      toast.success(
        `Lumpsum ₹${parsedAmount.toLocaleString("en-IN")} applied to ${paidCount} ${
          type === "supplier" ? "bill" : "udhar"
        }${paidCount > 1 ? "s" : ""}`
      );
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Lumpsum payment failed:", error);
      toast.error("Failed to process lumpsum payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview: which bills will be paid (capped at totalPending for preview)
  const effectiveAmount = Math.min(parsedAmount, totalPending);
  const previewBills = [];
  let previewRemaining = effectiveAmount;
  let totalPayingAmount = 0;
  for (const item of pendingItems) {
    if (previewRemaining <= 0) {
      previewBills.push({ ...item, payAmount: 0, fullyPaid: false, untouched: true });
      continue;
    }
    if (item.pendingAmount <= 0) continue;
    const payAmount = Math.min(previewRemaining, item.pendingAmount);
    previewRemaining -= payAmount;
    totalPayingAmount += payAmount;
    previewBills.push({
      ...item,
      payAmount,
      fullyPaid: payAmount >= item.pendingAmount,
      untouched: false,
    });
  }
  const billsBeingPaid = previewBills.filter((b) => !b.untouched);
  const billsUntouched = previewBills.filter((b) => b.untouched);

  const billLabel = type === "supplier" ? "Bill" : "Udhar";

  return (
    <>
      {/* Compact trigger button — place this inline in a bottom bar */}
      <button
        onClick={handleOpen}
        disabled={disabled || totalPending <= 0}
        className={cn(
          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          totalPending > 0
            ? type === "supplier"
              ? "bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400"
              : "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
            : "bg-muted text-muted-foreground",
          "disabled:opacity-50"
        )}
      >
        <Wallet className="h-3.5 w-3.5" />
        Pay Lumpsum
      </button>

      {/* Lumpsum Payment Sheet */}
      <Sheet
        open={open}
        onOpenChange={(val) => {
          // Don't close the sheet while the image viewer is open
          if (!val && imageViewerOpen) return;
          if (!isSubmitting) {
            setOpen(val);
            if (!val) resetForm();
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-2xl"
          hideClose
          onEscapeKeyDown={(e) => {
            if (imageViewerOpen) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (imageViewerOpen) e.preventDefault();
          }}
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Pay Lumpsum
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 pb-8">
            {/* Total Pending */}
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-xs text-muted-foreground">Total Pending</p>
              <p
                className={cn(
                  "font-mono text-2xl font-bold",
                  type === "supplier"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                ₹{totalPending.toLocaleString("en-IN")}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                across {pendingItems.length} {billLabel.toLowerCase()}
                {pendingItems.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Amount Input */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">
                Lumpsum Amount
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className={cn(
                    "input-hero pl-12 font-mono text-lg",
                    isOverLimit && "ring-2 ring-destructive/50 focus:ring-destructive"
                  )}
                  autoFocus
                />
              </div>
              {isOverLimit && (
                <div className="mt-1.5 flex items-center gap-1.5 text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <p className="text-xs">
                    Amount exceeds total pending of ₹{totalPending.toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setAmount(String(totalPending))}
              className={cn(
                "rounded-full px-3 py-1.5 font-mono text-sm transition-colors",
                parsedAmount === totalPending
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent"
              )}
            >
              Full — ₹{totalPending.toLocaleString("en-IN")}
            </button>

            {/* Receipt Images */}
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">
                Payment Receipts (optional)
              </label>

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
                    <ReceiptThumbnail
                      key={idx}
                      src={displayUrl}
                      idx={idx}
                      onTap={handleImageTap}
                      onRemove={handleRemoveImage}
                    />
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

            {/* Detailed Bills Preview */}
            {parsedAmount > 0 && !isOverLimit && previewBills.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">
                    {billLabel}s Breakdown
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {billsBeingPaid.length} of {pendingItems.length} will be paid
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-xl border border-border bg-muted/20">
                  {/* Bills being paid */}
                  {billsBeingPaid.map((bill, idx) => {
                    const pct = bill.totalAmount > 0
                      ? Math.round(((bill.paidAmount + bill.payAmount) / bill.totalAmount) * 100)
                      : 0;

                    return (
                      <div
                        key={bill.id}
                        className={cn(
                          "px-3 py-3",
                          idx !== 0 && "border-t border-border/50"
                        )}
                      >
                        {/* Top: description + paying amount */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                                bill.fullyPaid
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {bill.fullyPaid ? <Check className="h-3 w-3" /> : idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium leading-tight">
                                {bill.description || `${billLabel} #${idx + 1}`}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {bill.date
                                  ? new Date(bill.date).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "2-digit",
                                    })
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 flex-col items-end">
                            <span className="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                              +₹{bill.payAmount.toLocaleString("en-IN")}
                            </span>
                            {bill.fullyPaid ? (
                              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                                Fully cleared
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                of ₹{bill.pendingAmount.toLocaleString("en-IN")} pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress: thin bar + remaining */}
                        <div className="mt-2 flex items-center gap-2 pl-7">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                bill.fullyPaid ? "bg-emerald-500" : "bg-emerald-500/60"
                              )}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {bill.fullyPaid
                              ? "₹0"
                              : `₹${(bill.pendingAmount - bill.payAmount).toLocaleString("en-IN")}`} left
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Untouched bills */}
                  {billsUntouched.length > 0 && (
                    <div className="border-t border-border bg-muted/10 px-3 py-2.5">
                      <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                        Not covered ({billsUntouched.length})
                      </p>
                      <div className="space-y-1">
                        {billsUntouched.map((bill, idx) => (
                          <div
                            key={bill.id}
                            className="flex items-center justify-between text-[11px] text-muted-foreground/70"
                          >
                            <span className="truncate">
                              {bill.description || `${billLabel} #${billsBeingPaid.length + idx + 1}`}
                            </span>
                            <span className="flex-shrink-0 font-mono">
                              ₹{bill.pendingAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Summary row */}
                  {billsBeingPaid.length > 0 && (
                    <div className="flex items-center justify-between border-t border-border bg-emerald-500/5 px-3 py-2.5">
                      <span className="text-[11px] text-muted-foreground">
                        {billsBeingPaid.filter((b) => b.fullyPaid).length} cleared
                        {billsBeingPaid.filter((b) => !b.fullyPaid).length > 0 &&
                          `, ${billsBeingPaid.filter((b) => !b.fullyPaid).length} partial`}
                      </span>
                      <span className="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{totalPayingAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Over-limit warning with details */}
            {isOverLimit && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm font-medium">Amount too high</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  You entered ₹{parsedAmount.toLocaleString("en-IN")} but the total pending is only ₹{totalPending.toLocaleString("en-IN")}.
                  Please reduce the amount by ₹{(parsedAmount - totalPending).toLocaleString("en-IN")}.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="h-12 flex-1"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="h-12 flex-[2]"
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading || !isValidAmount}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ₹${parsedAmount.toLocaleString("en-IN")}`
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Image Gallery Viewer - rendered outside the Sheet to avoid close conflicts */}
      <ImageGalleryViewer
        images={receiptImages}
        initialIndex={viewerIndex}
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
      />
    </>
  );
}

export default LumpsumPaymentDrawer;
