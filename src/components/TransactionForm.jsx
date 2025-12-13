"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MultiImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  autoOpenSupplierDropdown = false,
}) {
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billImages, setBillImages] = useState(initialData?.billImages || []);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    initialData?.supplierId || defaultSupplierId || "",
  );
  const [paymentStatus, setPaymentStatus] = useState(
    initialData?.paymentStatus || "pending",
  );
  const [paymentMode, setPaymentMode] = useState(
    initialData?.paymentMode || "upi",
  );
  const [supplierSelectOpen, setSupplierSelectOpen] = useState(false);

  // Auto-open supplier dropdown when requested
  useEffect(() => {
    if (open && autoOpenSupplierDropdown && !selectedSupplierId) {
      setTimeout(() => {
        setSupplierSelectOpen(true);
      }, 500);
    }
  }, [open, autoOpenSupplierDropdown, selectedSupplierId]);

  useEffect(() => {
    if (open && quickCaptureData) {
      setSelectedSupplierId(quickCaptureData.supplierId);
      setPendingFiles(quickCaptureData.images || []);
      const previews =
        quickCaptureData.images?.map((file) => URL.createObjectURL(file)) || [];
      setBillImages(previews);
    }
  }, [open, quickCaptureData]);

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
      dueDate: "",
      notes: "",
    },
  });

  const handleFormSubmit = async (data) => {
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
              const localUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
              });
              uploadedUrls.push(localUrl);
            }
          } catch (error) {
            console.error("File upload failed:", error);
          }
        }
      }

      const finalBillImages =
        pendingFiles.length > 0 ? uploadedUrls : billImages;

      await onSubmit({
        ...data,
        supplierId: selectedSupplierId,
        paymentStatus,
        paymentMode,
        billImages: finalBillImages,
        amount: Number(data.amount) || 0,
      });
      reset();
      setBillImages([]);
      setPendingFiles([]);
      setSelectedSupplierId(defaultSupplierId || "");
      setPaymentStatus("pending");
      setPaymentMode("upi");
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
        if (
          !confirm("You have unsaved changes. Are you sure you want to close?")
        ) {
          return;
        }
      }
      reset();
      setBillImages(initialData?.billImages || []);
      setPendingFiles([]);
      setSelectedSupplierId(initialData?.supplierId || defaultSupplierId || "");
      setPaymentStatus(initialData?.paymentStatus || "pending");
      setPaymentMode(initialData?.paymentMode || "upi");
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="h-[90vh] rounded-t-2xl p-0 flex flex-col"
        hideClose
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="px-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>
                {initialData
                  ? "Update transaction details"
                  : "Record a new transaction"}
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-5 py-4"
          >
            {/* Offline warning */}
            {!isOnline && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                You&apos;re offline. Saving is disabled.
              </div>
            )}

            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select
                value={selectedSupplierId}
                onValueChange={(val) => {
                  setSelectedSupplierId(val);
                  setSupplierSelectOpen(false);
                }}
                disabled={!!defaultSupplierId}
                open={supplierSelectOpen}
                onOpenChange={setSupplierSelectOpen}
              >
                <SelectTrigger className="text-base h-11">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.companyName || supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bill Images - Moved to top */}
            <div className="space-y-2">
              <Label>
                Bill Photos
                {pendingFiles.length > 0 && (
                  <span className="ml-2 text-xs text-primary font-normal">
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
                        className="relative aspect-square rounded-lg overflow-hidden border bg-muted ring-2 ring-primary/50"
                      >
                        <img
                          src={url}
                          alt={`Captured bill ${index + 1}`}
                          className="w-full h-full object-cover"
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
                className="text-2xl h-14 font-semibold"
              />
              {errors.amount && (
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  {...register("date", { required: "Date is required" })}
                />
              </div>
            </div>

            <Separator />

            {/* Payment Info - Simplified */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date & Notes - Stacked vertically */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" {...register("dueDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  {...register("notes")}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            {/* Bottom padding for safe area */}
            <div className="h-4" />
          </form>
        </ScrollArea>

        <SheetFooter className="sticky bottom-0 px-6 py-4 border-t bg-background z-10 safe-area-bottom">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting || !selectedSupplierId || !isOnline}
              className="flex-1 h-12"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? "Update" : "Save"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default TransactionForm;
