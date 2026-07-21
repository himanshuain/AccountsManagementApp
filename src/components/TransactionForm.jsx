"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Expand,
  Receipt,
  IndianRupee,
  Calendar,
  Package,
  StickyNote,
} from "lucide-react";
import { Autocomplete, TextField, Avatar } from "@mui/material";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import { MultiImageUpload } from "./ImageUpload";
import { PhotoGalleryViewer } from "./PhotoViewer";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { resolveImageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";
import {
  FormSection,
  SegmentToggle,
  FormDrawerHeader,
  OfflineBanner,
  FormSubmitButton,
  MUI_AUTOCOMPLETE_SX,
  AUTOCOMPLETE_POPPER_PROPS,
  NO_SPIN_INPUT,
} from "@/components/form/FormDrawerUI";
import {
  addSessionStorageKeys,
  clearSessionStorageKeys,
  deleteStorageKeysClient,
  drainSessionStorageKeysForCancel,
  removeSessionStorageKeys,
} from "@/lib/orphan-upload-cleanup";

const EMPTY_ARRAY = [];

export function TransactionForm({
  open,
  onOpenChange,
  onSubmit,
  suppliers = EMPTY_ARRAY,
  initialData = null,
  defaultSupplierId = null,
  defaultSupplierName = null,
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
  const sessionUploadKeysRef = useRef(new Set());
  const sessionScopeRef = useRef("");
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
  const handleImageTap = index => {
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

  useEffect(() => {
    if (!open) {
      sessionScopeRef.current = "";
      return;
    }
    const scope = String(initialData?.id ?? "new");
    if (sessionScopeRef.current !== scope) {
      sessionScopeRef.current = scope;
      sessionUploadKeysRef.current.clear();
    }
  }, [open, initialData?.id]);

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
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
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

  /** Storage key or http(s) URL only — never data:/blob: in the database */
  const isPersistableBillRef = s =>
    typeof s === "string" &&
    s.length > 0 &&
    !s.startsWith("data:") &&
    !s.startsWith("blob:") &&
    (s.startsWith("http://") ||
      s.startsWith("https://") ||
      (/^[a-zA-Z0-9_\-/.]+$/.test(s) && !s.startsWith("http")));

  const uploadBillFile = async file => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "bills");
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Bill photo upload failed");
    }
    return payload.storageKey || payload.url;
  };

  const handleFormSubmit = async data => {
    if (!selectedSupplierId || !isOnline) {
      return;
    }
    if (isUploadingBills) return;

    setIsSubmitting(true);
    try {
      const billStorageKeys = [];

      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            const key = await uploadBillFile(file);
            billStorageKeys.push(key);
          } catch (e) {
            console.error("Bill upload failed:", e);
            toast.error(e?.message || "Could not upload a bill photo. Nothing was saved.");
            return;
          }
        }
      } else if (billImages.length > 0) {
        for (let i = 0; i < billImages.length; i++) {
          const img = billImages[i];
          if (!img) continue;
          if (img.startsWith("data:")) {
            try {
              const file = base64ToFile(img, `bill-${Date.now()}-${i}.jpg`);
              const key = await uploadBillFile(file);
              billStorageKeys.push(key);
            } catch (e) {
              console.error("Bill upload failed:", e);
              toast.error(e?.message || "Could not upload a bill photo. Nothing was saved.");
              return;
            }
          } else if (isPersistableBillRef(img)) {
            billStorageKeys.push(img);
          } else if (img.startsWith("blob:")) {
            toast.error("Bill previews are still loading. Wait a moment and save again.");
            return;
          } else {
            toast.error("Invalid bill photo. Remove it and add the photo again.");
            return;
          }
        }
      }

      if (billStorageKeys.some(k => typeof k === "string" && (k.startsWith("data:") || k.startsWith("blob:")))) {
        toast.error("Bill photos must finish uploading before save.");
        return;
      }

      const finalBillImages = billStorageKeys;

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
      clearSessionStorageKeys(sessionUploadKeysRef);
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

  const isFormDirty = () => {
    if (isDirty || pendingFiles.length > 0) return true;
    const original = initialData?.billImages || [];
    if (billImages.length !== original.length) return true;
    return billImages.some((img, i) => img !== original[i]);
  };

  const resetAndClose = () => {
    deleteStorageKeysClient(drainSessionStorageKeysForCancel(sessionUploadKeysRef));
    reset();
    setBillImages(initialData?.billImages || []);
    setPendingFiles([]);
    setSelectedSupplierId(initialData?.supplierId || defaultSupplierId || "");
    setIsPaid(initialData?.paymentStatus === "paid" || false);
    setIsCash(initialData?.paymentMode === "cash" || false);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      if (isFormDirty()) {
        if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
          return;
        }
      }
      resetAndClose();
    }
  };

  const handleBeforeClose = async () => {
    if (isSubmitting) return false;
    if (!isFormDirty()) return true;
    return confirm("You have unsaved changes. Are you sure you want to close?");
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) || null;
  const contextSupplierLabel =
    selectedSupplier?.companyName ||
    selectedSupplier?.name ||
    defaultSupplierName ||
    null;
  const isSupplierLocked = !!defaultSupplierId;
  const formTitle = initialData ? "Edit Transaction" : title;
  const submitLabel = initialData ? "Save changes" : "Add transaction";
  const canSubmit = !isSubmitting && !!selectedSupplierId && isOnline && !isUploadingBills;

  return (
    <DragCloseDrawer
      open={open}
      onOpenChange={v => {
        if (!v) resetAndClose();
      }}
      beforeClose={handleBeforeClose}
      height="h-[92vh]"
    >
      <FormDrawerHeader
        title={formTitle}
        icon={Receipt}
        subtitle={isSupplierLocked ? contextSupplierLabel : null}
        onClose={handleClose}
        onSubmit={handleSubmit(handleFormSubmit)}
        isSubmitting={isSubmitting}
        isEdit={!!initialData}
        canSubmit={canSubmit}
      />

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 px-4 py-4 pb-8">
        {!isOnline && <OfflineBanner />}

        {/* Bill photos — minimal chrome, smart layout inside MultiImageUpload */}
        <div className="space-y-2">
          <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Bill photos
          </p>
          {pendingFiles.length > 0 ? (
            <div className="space-y-2">
              {billImages.length === 1 ? (
                <div
                  className="group relative aspect-[16/10] cursor-pointer overflow-hidden rounded-xl border bg-muted shadow-sm ring-2 ring-primary/30"
                  onClick={() => handleImageTap(0)}
                >
                  <img
                    src={resolveImageUrl(billImages[0])}
                    alt="Captured bill"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                    <Expand className="h-6 w-6 text-white opacity-0 group-hover:opacity-70" />
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto pb-0.5">
                    {billImages.map((url, index) => (
                      <div
                        key={index}
                        className={cn(
                          "group relative shrink-0 cursor-pointer overflow-hidden rounded-xl border bg-muted shadow-sm ring-2 ring-primary/30",
                          billImages.length === 1
                            ? "h-24 min-w-0 flex-1"
                            : "h-24 w-[108px] snap-start"
                        )}
                        onClick={() => handleImageTap(index)}
                      >
                        <img
                          src={resolveImageUrl(url)}
                          alt={`Captured bill ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {pendingFiles.length} photo{pendingFiles.length !== 1 ? "s" : ""} · uploads on save
              </p>
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
              layout="hero"
              attachLabel="Attach bill photos"
              onUploadingChange={setIsUploadingBills}
              onSessionStorageKeysAdded={keys => addSessionStorageKeys(sessionUploadKeysRef, keys)}
              onSessionStorageKeysRemoved={keys =>
                removeSessionStorageKeys(sessionUploadKeysRef, keys)
              }
              folder="bills"
            />
          )}
        </div>

        {/* Amount — primary field, directly under photos */}
        <div className="overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-4 shadow-sm">
          <label
            htmlFor="amount"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Amount (₹) *
          </label>
          <div className="relative">
            <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-rose-600/70 dark:text-rose-400/70" />
            <input
              id="amount"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              {...register("amount", { required: "Amount is required" })}
              placeholder="0"
              className={cn(
                "input-hero h-14 pl-12 font-mono text-3xl font-bold tabular-nums tracking-tight",
                NO_SPIN_INPUT
              )}
            />
          </div>
          {errors.amount && (
            <p className="mt-2 text-xs text-destructive">{errors.amount.message}</p>
          )}
          {initialData?.paidAmount > 0 && (
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Already paid ₹{initialData.paidAmount.toLocaleString("en-IN")}
                {initialData.payments?.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal opacity-80">
                    · {initialData.payments.length} payment
                    {initialData.payments.length > 1 ? "s" : ""}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                Payment history is kept when you save.
              </p>
            </div>
          )}
        </div>

        {/* Vyapari picker — only when not opened from a supplier chat/profile */}
        {!isSupplierLocked && (
          <FormSection title="Vyapari">
            <div className="rounded-xl bg-muted/50 px-1 py-0.5">
              <Autocomplete
                options={suppliers}
                value={selectedSupplier}
                onChange={(_, newValue) => setSelectedSupplierId(newValue?.id || "")}
                disabled={!isOnline}
                getOptionLabel={opt => opt?.companyName || opt?.name || ""}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                renderInput={params => (
                  <TextField
                    {...params}
                    placeholder="Search vyapari…"
                    required
                    variant="outlined"
                    sx={MUI_AUTOCOMPLETE_SX}
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
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {option.companyName || option.name}
                          </div>
                          {option.phone && (
                            <div className="text-xs opacity-70">{option.phone}</div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                }}
                noOptionsText="No vyapari found"
                fullWidth
                slotProps={AUTOCOMPLETE_POPPER_PROPS}
              />
            </div>
            {!selectedSupplierId && (
              <p className="mt-2 text-xs text-destructive">Select a vyapari to continue</p>
            )}
          </FormSection>
        )}

        {/* Item & date */}
        <FormSection title="Details" icon={Package}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="itemName"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Item
              </label>
              <input
                id="itemName"
                {...register("itemName")}
                placeholder="Clothes"
                className="input-hero h-11 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="date"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Date *
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="date"
                  type="date"
                  {...register("date", {
                    required: "Date is required",
                    validate: value => {
                      const today = getLocalDate();
                      if (value > today) return "Future dates are not allowed";
                      return true;
                    },
                  })}
                  onChange={e => {
                    const today = getLocalDate();
                    if (e.target.value > today) {
                      e.target.value = today;
                    }
                  }}
                  max={new Date().toISOString().split("T")[0]}
                  className="input-hero h-11 pr-10 text-sm"
                />
              </div>
              {errors.date && (
                <p className="mt-1 text-[10px] text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Payment"
          icon={IndianRupee}
          iconClassName={isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
          titleClassName={isPaid ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}
          className={cn(
            "[&>div:last-child]:py-3 transition-colors",
            isPaid
              ? "border-emerald-500/30 bg-emerald-500/[0.06]"
              : "border-rose-500/30 bg-rose-500/[0.06]"
          )}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Mode
              </p>
              <SegmentToggle
                value={isCash ? "cash" : "upi"}
                onChange={v => setIsCash(v === "cash")}
                disabled={!isOnline}
                options={[
                  {
                    value: "upi",
                    label: "UPI",
                    activeClass:
                      "bg-sky-500/20 text-sky-700 shadow-sm ring-1 ring-sky-500/30 dark:text-sky-400",
                  },
                  {
                    value: "cash",
                    label: "Cash",
                    activeClass:
                      "bg-amber-500/20 text-amber-800 shadow-sm ring-1 ring-amber-500/30 dark:text-amber-400",
                  },
                ]}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <SegmentToggle
                value={isPaid ? "paid" : "pending"}
                onChange={v => setIsPaid(v === "paid")}
                disabled={!isOnline}
                options={[
                  {
                    value: "pending",
                    label: "Pending",
                    activeClass:
                      "bg-rose-500/20 text-rose-700 shadow-sm ring-1 ring-rose-500/30 dark:text-rose-400",
                  },
                  {
                    value: "paid",
                    label: "Paid",
                    activeClass:
                      "bg-emerald-500/20 text-emerald-700 shadow-sm ring-1 ring-emerald-500/30 dark:text-emerald-400",
                  },
                ]}
              />
            </div>
          </div>
        </FormSection>

        <FormSection title="Notes" icon={StickyNote} className="[&>div:last-child]:py-3">
          <textarea
            id="notes"
            rows={2}
            {...register("notes")}
            placeholder="Optional notes…"
            className="input-hero min-h-[72px] resize-none py-2.5 text-sm leading-relaxed"
          />
        </FormSection>

        <FormSubmitButton disabled={!canSubmit} isSubmitting={isSubmitting}>
          {submitLabel}
        </FormSubmitButton>
      </form>
    </DragCloseDrawer>
  );
}

export default TransactionForm;
