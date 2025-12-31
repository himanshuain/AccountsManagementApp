"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Loader2, X, Check, Expand } from "lucide-react";
import { Autocomplete, TextField, Avatar } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { MultiImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import { PhotoGalleryViewer } from "./PhotoViewer";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { resolveImageUrl } from "@/lib/image-url";

// Stable empty array reference to prevent infinite re-renders
const EMPTY_ARRAY = [];

export function TransactionForm({
  open,
  onOpenChange,
  onSubmit,
  suppliers = EMPTY_ARRAY,
  initialData = null,
  defaultSupplierId = null,
  quickCaptureData = null,
  initialBillImages,
  autoOpenSupplierDropdown = false,
  title = "Add Transaction",
}) {
  // Use stable reference for initialBillImages
  const stableInitialBillImages = useMemo(
    () => initialBillImages || EMPTY_ARRAY,
    [initialBillImages]
  );
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billImages, setBillImages] = useState(initialData?.billImages || []);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    initialData?.supplierId || defaultSupplierId || ""
  );
  const [isPaid, setIsPaid] = useState(initialData?.paymentStatus === "paid" || false);
  const [isCash, setIsCash] = useState(initialData?.paymentMode === "cash" || false);
  const [isUploadingBills, setIsUploadingBills] = useState(false);
  // Image viewer state for captured images (pendingFiles mode)
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Handle image tap to view (for captured images)
  const handleImageTap = (index) => {
    setViewerIndex(index);
    setImageViewerOpen(true);
  };
  
  // Handle quickCaptureData (legacy support)
  useEffect(() => {
    if (open && quickCaptureData) {
      setSelectedSupplierId(quickCaptureData.supplierId);
      setPendingFiles(quickCaptureData.images || []);
      const previews = quickCaptureData.images?.map(file => URL.createObjectURL(file)) || [];
      setBillImages(previews);
    }
  }, [open, quickCaptureData]);

  // Handle initialBillImages (new prop for captured images)
  useEffect(() => {
    if (open && stableInitialBillImages && stableInitialBillImages.length > 0) {
      // initialBillImages are base64 data URLs, set them directly as previews
      setBillImages(stableInitialBillImages);
    }
  }, [open, stableInitialBillImages]);

  // Reset form state when opening
  useEffect(() => {
    if (open) {
      setIsPaid(initialData?.paymentStatus === "paid" || false);
      setIsCash(initialData?.paymentMode === "cash" || false);
      // Set supplier from initialData or defaultSupplierId
      setSelectedSupplierId(initialData?.supplierId || defaultSupplierId || "");
      // Reset bill images only if no initialBillImages provided
      if (stableInitialBillImages.length === 0) {
        setBillImages(initialData?.billImages || []);
      }
      setPendingFiles([]);
    }
  }, [open, initialData, defaultSupplierId, stableInitialBillImages]);

  // Get today's date in local timezone (YYYY-MM-DD format)
  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      date: getLocalDate(),
      amount: "",
      itemName: "Clothes",
      notes: "",
    },
  });

  // Reset form values when initialData changes (for editing)
  useEffect(() => {
    if (open && initialData) {
      reset({
        date: initialData.date || getLocalDate(),
        amount: initialData.amount || "",
        itemName: initialData.itemName || "Clothes",
        notes: initialData.notes || "",
      });
    } else if (open && !initialData) {
      reset({
        date: getLocalDate(),
        amount: "",
        itemName: "Clothes",
        notes: "",
      });
    }
  }, [open, initialData, reset]);

  // Helper function to convert base64 data URL to File
  const base64ToFile = (dataUrl, filename) => {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleFormSubmit = async data => {
    if (!selectedSupplierId || !isOnline) {
      return;
    }
    if (isUploadingBills) return;

    setIsSubmitting(true);
    try {
      let uploadedUrls = [];
      
      // Upload pending files (from file picker)
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const { url } = await response.json();
              uploadedUrls.push(url);
            } else {
              const localUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
              });
              uploadedUrls.push(localUrl);
            }
          } catch (error) {
            console.error("File upload failed:", error);
          }
        }
      }
      
      // Upload base64 images (from camera capture) that haven't been uploaded yet
      if (pendingFiles.length === 0 && billImages.length > 0) {
        for (let i = 0; i < billImages.length; i++) {
          const img = billImages[i];
          // Check if this is a base64 data URL that needs uploading
          if (img.startsWith("data:")) {
            try {
              const file = base64ToFile(img, `bill-${Date.now()}-${i}.jpg`);
              const formData = new FormData();
              formData.append("file", file);

              const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
              });

              if (response.ok) {
                const { url } = await response.json();
                uploadedUrls.push(url);
              } else {
                // If upload fails, we can't use the base64 - it's too large for DB
                console.error("Failed to upload camera image");
              }
            } catch (error) {
              console.error("Camera image upload failed:", error);
            }
          } else {
            // Already a URL, keep it
            uploadedUrls.push(img);
          }
        }
      }

      const finalBillImages = uploadedUrls.length > 0 ? uploadedUrls : billImages.filter(img => !img.startsWith("data:"));

      // Calculate payment status based on existing payments and new amount
      const newAmount = Number(data.amount) || 0;
      const existingPaidAmount = initialData?.paidAmount || 0;
      const existingPayments = initialData?.payments || [];

      let calculatedPaymentStatus;
      if (isPaid) {
        calculatedPaymentStatus = "paid";
      } else if (existingPaidAmount > 0) {
        // If there are existing payments, check if they cover the new amount
        if (existingPaidAmount >= newAmount) {
          calculatedPaymentStatus = "paid";
        } else {
          calculatedPaymentStatus = "partial";
        }
      } else {
        calculatedPaymentStatus = "pending";
      }

      await onSubmit({
        ...data,
        supplierId: selectedSupplierId,
        paymentStatus: calculatedPaymentStatus,
        paymentMode: isCash ? "cash" : "upi",
        billImages: finalBillImages,
        amount: newAmount,
        // Preserve existing payments and paidAmount when editing
        ...(initialData && {
          payments: existingPayments,
          paidAmount: existingPaidAmount,
        }),
      });
      reset();
      setBillImages([]);
      setPendingFiles([]);
      setSelectedSupplierId(defaultSupplierId || "");
      setIsPaid(false);
      setIsCash(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      if (isDirty || billImages.length > 0 || pendingFiles.length > 0) {
        if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
          return;
        }
      }
      reset();
      setBillImages(initialData?.billImages || []);
      setPendingFiles([]);
      setSelectedSupplierId(initialData?.supplierId || defaultSupplierId || "");
      setIsPaid(initialData?.paymentStatus === "paid" || false);
      setIsCash(initialData?.paymentMode === "cash" || false);
      onOpenChange(false);
    }
  };

  // Handler for Sheet's onOpenChange - only close, don't interfere with opening
  const handleSheetOpenChange = (isOpen) => {
    if (!isOpen) {
      handleClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[90vh] flex-col rounded-t-2xl p-0"
        hideClose
        onSwipeClose={handleClose}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-2 pt-3" data-drag-handle>
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header with action buttons */}
        <SheetHeader className="border-b px-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-9 px-3"
            >
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <SheetTitle className="flex-1 text-center text-base font-semibold">
              {initialData ? "Edit Transaction" : title}
            </SheetTitle>
            <Button
              size="sm"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting || !selectedSupplierId || !isOnline || isUploadingBills}
              className="h-9 px-3"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  {initialData ? "Save" : "Add"}
                </>
              )}
            </Button>
          </div>
        </SheetHeader>

        <div className="pb-safe flex-1 overflow-y-auto px-6">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 py-4">
            {/* Offline warning */}
            {!isOnline && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600">
                You&apos;re offline. Saving is disabled.
              </div>
            )}

            {/* Supplier Selection */}
            <div className="space-y-2">
              <Autocomplete
                options={suppliers}
                value={suppliers.find(s => s.id === selectedSupplierId) || null}
                onChange={(_, newValue) => setSelectedSupplierId(newValue?.id || "")}
                disabled={!!defaultSupplierId || !isOnline}
                getOptionLabel={opt => opt?.companyName || opt?.name || ""}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                renderInput={params => (
                  <TextField
                    {...params}
                    label="Vyapari"
                    placeholder="Select vyapari"
                    required
                    sx={{
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
                      "& .MuiInputLabel-root": {
                        color: "hsl(var(--muted-foreground))",
                        "&.Mui-focused": {
                          color: "hsl(var(--primary))",
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
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <li {...otherProps} key={option.id}>
                      <div className="flex w-full items-center gap-3">
                        <Avatar
                          src={resolveImageUrl(option.profilePicture)}
                          alt={option.companyName}
                          sx={{ width: 32, height: 32 }}
                        >
                          {(option.companyName || option.name || "").charAt(0).toUpperCase()}
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">{option.companyName || option.name}</div>
                          {option.phone && <div className="text-xs opacity-70">{option.phone}</div>}
                        </div>
                      </div>
                    </li>
                  );
                }}
                noOptionsText="No vyapari found"
                fullWidth
                slotProps={{
                  paper: {
                    elevation: 8,
                    sx: {
                      mt: 1,
                      bgcolor: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                      border: "1px solid hsl(var(--border))",
                      pointerEvents: "auto",
                      "& .MuiAutocomplete-listbox": {
                        padding: "4px",
                        pointerEvents: "auto",
                        "& .MuiAutocomplete-option": {
                          minHeight: 48,
                          borderRadius: "6px",
                          color: "hsl(var(--foreground))",
                          pointerEvents: "auto",
                          cursor: "pointer",
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
                    disablePortal: false,
                    sx: {
                      zIndex: 2147483647,
                    },
                    container: typeof document !== "undefined" ? document.body : undefined,
                    modifiers: [
                      {
                        name: "preventOverflow",
                        enabled: false,
                      },
                    ],
                  },
                }}
              />
            </div>

            {/* Bill Images - Moved to top */}
            <div className="space-y-2">
              <Label>
                Bill Photos
                {pendingFiles.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-primary">
                    ({pendingFiles.length} captured)
                  </span>
                )}
              </Label>
              {pendingFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {billImages.map((url, index) => (
                      <div
                        key={index}
                        className="relative aspect-square overflow-hidden rounded-lg border bg-muted ring-2 ring-primary/50 cursor-pointer group"
                        onClick={() => handleImageTap(index)}
                      >
                        <img
                          src={resolveImageUrl(url)}
                          alt={`Captured bill ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {/* Tap to expand hint */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Expand className="h-5 w-5 text-white opacity-0 group-hover:opacity-70" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pendingFiles.length} bill(s) will be uploaded when you save • Tap image to expand
                  </p>
                  {/* Image Viewer for captured images */}
                  <PhotoGalleryViewer
                    images={billImages}
                    initialIndex={viewerIndex}
                    open={imageViewerOpen}
                    onOpenChange={setImageViewerOpen}
                  />
                </div>
              ) : (
                <MultiImageUpload
                  value={billImages}
                  onChange={setBillImages}
                  maxImages={5}
                  disabled={!isOnline}
                  onUploadingChange={setIsUploadingBills}
                  folder="bills"
                />
              )}
            </div>

            <Separator />

            {/* Amount - Big and prominent */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                {...register("amount", { required: "Amount is required" })}
                placeholder="Enter amount"
                className="h-14 text-2xl font-semibold"
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              {/* Show existing payment info when editing */}
              {initialData?.paidAmount > 0 && (
                <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                  <p className="text-sm text-green-700">
                    Already paid: ₹{initialData.paidAmount.toLocaleString()}
                    {initialData.payments?.length > 0 && (
                      <span className="ml-2 text-xs">
                        ({initialData.payments.length} payment
                        {initialData.payments.length > 1 ? "s" : ""})
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-green-600">
                    Payment history will be preserved when you save.
                  </p>
                </div>
              )}
            </div>

            {/* Item Name & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemName">Item</Label>
                <Input
                  id="itemName"
                  {...register("itemName")}
                  placeholder="Clothes"
                  defaultValue="Clothes"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  {...register("date", { required: "Date is required" })}
                  max={new Date().toISOString().split("T")[0]}
                  className="h-12"
                />
              </div>
            </div>

            <Separator />

            {/* Payment Info - Using Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="space-y-0.5">
                  <Label className="text-base">Payment Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    {isCash ? "Cash payment" : "UPI payment"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">UPI</span>
                  <Switch checked={isCash} onCheckedChange={setIsCash} />
                  <span className="text-sm text-muted-foreground">Cash</span>
                </div>
              </div>

              <div className={`flex items-center justify-between rounded-lg bg-muted/50 p-3 $`}>
                <div className="space-y-0.5">
                  <Label className="text-base">Payment Status</Label>
                  <p className="text-xs text-muted-foreground">
                    {isPaid ? "Already paid" : "Payment pending"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                  <span className="text-sm text-muted-foreground">Paid</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                {...register("notes")}
                placeholder="Optional notes"
                className="h-12"
              />
            </div>

            {/* Bottom padding for safe area */}
            <div className="h-8" />
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TransactionForm;
