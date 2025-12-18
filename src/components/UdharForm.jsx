"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, UserPlus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MultiImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import { Autocomplete } from "@/components/ui/autocomplete";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { CustomerForm } from "./CustomerForm";

export function UdharForm({
  open,
  onOpenChange,
  onSubmit,
  onAddCustomer,
  customers = [],
  initialData = null,
  defaultCustomerId = null,
  title = "Add Udhar",
}) {
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [khataPhotos, setKhataPhotos] = useState(initialData?.khataPhotos || []);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialData?.customerId || defaultCustomerId || ""
  );
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [isUploadingKhata, setIsUploadingKhata] = useState(false);

  const defaultFormValues = {
    date: new Date().toISOString().split("T")[0],
    amount: "",
    notes: "",
    itemDescription: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: initialData || defaultFormValues,
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setKhataPhotos(initialData.khataPhotos || []);
        setSelectedCustomerId(initialData.customerId || "");
        // Calculate total from old cash+online or use amount directly
        const totalAmount =
          initialData.amount || (initialData.cashAmount || 0) + (initialData.onlineAmount || 0);
        reset({
          date: initialData.date || new Date().toISOString().split("T")[0],
          amount: totalAmount || "",
          notes: initialData.notes || "",
          itemDescription: initialData.itemDescription || "",
        });
      } else {
        setKhataPhotos([]);
        setSelectedCustomerId(defaultCustomerId || "");
        reset(defaultFormValues);
      }
    }
  }, [open, initialData, defaultCustomerId, reset]);

  const handleFormSubmit = async data => {
    if (!selectedCustomerId) {
      return;
    }
    if (!isOnline) return;
    if (isUploadingKhata) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        customerId: selectedCustomerId,
        khataPhotos,
        amount: Number(data.amount) || 0,
        // Keep for backward compatibility
        cashAmount: Number(data.amount) || 0,
        onlineAmount: 0,
      });
      reset();
      setKhataPhotos([]);
      setSelectedCustomerId(defaultCustomerId || "");
      onOpenChange(false);
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      if (isDirty || khataPhotos.length > 0) {
        if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
          return;
        }
      }
      reset();
      setKhataPhotos(initialData?.khataPhotos || []);
      setSelectedCustomerId(initialData?.customerId || defaultCustomerId || "");
      onOpenChange(false);
    }
  };

  const handleNewCustomer = async customerData => {
    const result = await onAddCustomer(customerData);
    if (result.success) {
      setSelectedCustomerId(result.data.id);
      setCustomerFormOpen(false);
    }
    return result;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="flex h-[90vh] flex-col rounded-t-2xl p-0" hideClose>
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
                {title}
              </SheetTitle>
              <Button
                size="sm"
                onClick={handleSubmit(handleFormSubmit)}
                disabled={isSubmitting || !selectedCustomerId || !isOnline || isUploadingKhata}
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
              {!isOnline && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600">
                  You&apos;re offline. Saving is disabled.
                </div>
              )}

              {/* Customer Selection */}
              <div className="space-y-2">
                <Label>Customer *</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Autocomplete
                      options={customers}
                      value={selectedCustomerId}
                      onValueChange={setSelectedCustomerId}
                      placeholder="Select customer"
                      searchPlaceholder="Search customer..."
                      emptyText="No customer found"
                      disabled={!!defaultCustomerId || !isOnline}
                      getOptionLabel={opt => opt?.name || ""}
                      getOptionValue={opt => opt?.id || ""}
                      triggerClassName="h-12 text-base"
                    />
                  </div>
                  {/* <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => setCustomerFormOpen(true)}
                    disabled={!isOnline}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button> */}
                </div>
                {!selectedCustomerId && (
                  <p className="text-xs text-muted-foreground">Select a customer or add new</p>
                )}
              </div>

              {/* Khata Photos */}
              <div className="space-y-2">
                <Label>Khata Photos</Label>
                <MultiImageUpload
                  value={khataPhotos}
                  onChange={setKhataPhotos}
                  maxImages={5}
                  disabled={!isOnline}
                  onUploadingChange={setIsUploadingKhata}
                />
              </div>

              <Separator />

              {/* Amount Input - Single field */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  inputMode="numeric"
                  {...register("amount", { required: "Amount is required" })}
                  placeholder="Enter amount"
                  className="h-16 text-2xl font-bold"
                  disabled={!isOnline}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Udhari Date *</Label>
                <Input
                  id="date"
                  type="date"
                  {...register("date", { required: "Date is required" })}
                  disabled={!isOnline}
                  className="h-12"
                />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="notes">Description</Label>
                <textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Add any details about this Udhar..."
                  disabled={!isOnline}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Bottom padding for safe area */}
              <div className="h-8" />
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Customer Form Sheet */}
      <CustomerForm
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
        onSubmit={handleNewCustomer}
        title="Add New Customer"
      />
    </>
  );
}

export default UdharForm;
