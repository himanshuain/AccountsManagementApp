"use client";

import { useState, useRef } from "react";
import { X, IndianRupee, Camera, ImagePlus, Expand } from "lucide-react";
import { toast } from "sonner";
import {
  PhotoGalleryViewer as ImageGalleryViewer,
} from "@/components/PhotoViewer";
import { getImageUrls, isDataUrl } from "@/lib/image-url";
import { compressImage, compressForHD } from "@/lib/image-compression";
import { cn } from "@/lib/utils";
import { getLocalDate } from "@/lib/date-utils";

/**
 * Payment Form Modal Component with image upload
 */
export function PaymentFormModal({ txn, onClose, onSubmit, isSubmitting }) {
  const today = getLocalDate();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [isReturn, setIsReturn] = useState(false);
  const [receiptImages, setReceiptImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isHDMode, setIsHDMode] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const paidAmount = txn.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingAmount = (Number(txn.amount) || 0) - (Number(paidAmount) || 0);

  const handleImageTap = index => {
    setViewerIndex(index);
    setImageViewerOpen(true);
  };

  const handleFileSelect = async e => {
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
    if (!isReturn && paymentAmount <= 0) {
      toast.error("Enter valid amount");
      return;
    }
    if (isReturn && paymentAmount < 0) {
      toast.error("Amount cannot be negative");
      return;
    }
    if (!isReturn && paymentAmount > remainingAmount) {
      toast.error(`Max amount is ₹${remainingAmount.toLocaleString("en-IN")}`);
      return;
    }
    onSubmit(paymentAmount, date, false, receiptImages, notes, isReturn);
  };

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
            <h3 className="font-heading text-lg tracking-wide">Record Payment</h3>
            <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 rounded-xl bg-muted py-4 text-center">
            <p className="mb-1 text-xs text-muted-foreground">Pending Amount</p>
            <p className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-400">
              ₹{remainingAmount.toLocaleString("en-IN")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Payment Amount</label>
              <div className="relative">
                <IndianRupee className="absolute right-8 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="input-hero pl-12 font-mono text-lg"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAmount(String(remainingAmount))}
              className={cn(
                "rounded-full px-3 py-1.5 font-mono text-sm transition-colors",
                Number(amount) === remainingAmount
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent"
              )}
            >
              Full — ₹{remainingAmount.toLocaleString("en-IN")}
            </button>

            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Payment Date</label>
              <input
                type="date"
                value={date}
                onChange={e => {
                  const selectedDate = e.target.value;
                  if (selectedDate > today) {
                    setDate(today);
                  } else {
                    setDate(selectedDate);
                  }
                }}
                max={today}
                className="input-hero"
              />
            </div>

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

            <div>
              <label className="mb-2 block text-sm text-muted-foreground">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Payment notes..."
                className="input-hero min-h-[60px] resize-none"
              />
            </div>

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
                    <div
                      key={idx}
                      className="group relative h-16 w-16 overflow-hidden rounded-lg bg-muted"
                    >
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

            <div className="pb-safe pt-4">
              <button
                type="submit"
                disabled={isSubmitting || !amount || isUploading}
                className="btn-hero w-full disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Record Payment"}
              </button>
            </div>
          </form>
        </div>

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

export default PaymentFormModal;
