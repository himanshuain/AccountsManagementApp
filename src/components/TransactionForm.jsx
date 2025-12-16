"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { MultiImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import { Autocomplete } from "@/components/ui/autocomplete";
import useOnlineStatus from "@/hooks/useOnlineStatus";

export function TransactionForm({
  open,
  onOpenChange,
  onSubmit,
  suppliers = [],
  initialData = null,
  defaultSupplierId = null,
  quickCaptureData = null,
  title = "Add Transaction",
}) {
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billImages, setBillImages] = useState(initialData?.billImages || []);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    initialData?.supplierId || defaultSupplierId || ""
  );
  const [isPaid, setIsPaid] = useState(initialData?.paymentStatus === "paid" || false);
  const [isCash, setIsCash] = useState(initialData?.paymentMode === "cash" || false);
  useEffect(() => {
    if (open && quickCaptureData) {
      setSelectedSupplierId(quickCaptureData.supplierId);
      setPendingFiles(quickCaptureData.images || []);
      const previews = quickCaptureData.images?.map(file => URL.createObjectURL(file)) || [];
      setBillImages(previews);
    }
  }, [open, quickCaptureData]);

  // Reset form state when opening
  useEffect(() => {
    if (open) {
      setIsPaid(initialData?.paymentStatus === "paid" || false);
      setIsCash(initialData?.paymentMode === "cash" || false);
      // Set supplier from initialData or defaultSupplierId
      setSelectedSupplierId(initialData?.supplierId || defaultSupplierId || "");
      // Reset bill images
      setBillImages(initialData?.billImages || []);
      setPendingFiles([]);
    }
  }, [open, initialData, defaultSupplierId]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: initialData || {
      date: new Date().toISOString().split("T")[0],
      amount: "",
      itemName: "Clothes",
      notes: "",
    },
  });

  const handleFormSubmit = async data => {
    if (!selectedSupplierId || !isOnline) {
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedUrls = [];
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

      const finalBillImages = pendingFiles.length > 0 ? uploadedUrls : billImages;

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

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="flex h-[90vh] flex-col rounded-t-2xl p-0"
        hideClose
        onSwipeClose={handleClose}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-2 pt-3">
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
            <SheetTitle className="flex-1 text-center text-base font-semibold">{title}</SheetTitle>
            <Button
              size="sm"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting || !selectedSupplierId || !isOnline}
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
              <Label>Vyapari *</Label>
              <Autocomplete
                options={suppliers}
                value={selectedSupplierId}
                onValueChange={setSelectedSupplierId}
                placeholder="Select vyapari"
                searchPlaceholder="Search vyapari..."
                emptyText="No vyapari found"
                disabled={!!defaultSupplierId}
                getOptionLabel={opt => opt?.companyName || opt?.name || ""}
                getOptionValue={opt => opt?.id || ""}
                triggerClassName="h-12 text-base"
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
                        className="relative aspect-square overflow-hidden rounded-lg border bg-muted ring-2 ring-primary/50"
                      >
                        <img
                          src={url}
                          alt={`Captured bill ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pendingFiles.length} bill(s) will be uploaded when you save
                  </p>
                </div>
              ) : (
                <MultiImageUpload
                  value={billImages}
                  onChange={setBillImages}
                  maxImages={5}
                  disabled={!isOnline}
                />
              )}
            </div>

            <Separator />

            {/* Amount - Big and prominent */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="text"
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

              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
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
