"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  autoOpenCustomerDropdown = false,
}) {
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [khataPhotos, setKhataPhotos] = useState(
    initialData?.khataPhotos || [],
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialData?.customerId || defaultCustomerId || "",
  );
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [customerSelectOpen, setCustomerSelectOpen] = useState(false);

  // Auto-open customer dropdown when requested
  useEffect(() => {
    if (open && autoOpenCustomerDropdown && !selectedCustomerId) {
      setTimeout(() => {
        setCustomerSelectOpen(true);
      }, 500);
    }
  }, [open, autoOpenCustomerDropdown, selectedCustomerId]);

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
          initialData.amount ||
          (initialData.cashAmount || 0) + (initialData.onlineAmount || 0);
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

  const handleFormSubmit = async (data) => {
    if (!selectedCustomerId) {
      return;
    }
    if (!isOnline) return;

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
        if (
          !confirm("You have unsaved changes. Are you sure you want to close?")
        ) {
          return;
        }
      }
      reset();
      setKhataPhotos(initialData?.khataPhotos || []);
      setSelectedCustomerId(initialData?.customerId || defaultCustomerId || "");
      onOpenChange(false);
    }
  };

  const handleNewCustomer = async (customerData) => {
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
                    ? "Update Udhar details"
                    : "Record a new Udhar (lending) entry"}
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
              {!isOnline && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                  You&apos;re offline. Saving is disabled.
                </div>
              )}

              {/* Customer Selection */}
              <div className="space-y-2">
                <Label>Customer *</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedCustomerId}
                    onValueChange={(val) => {
                      setSelectedCustomerId(val);
                      setCustomerSelectOpen(false);
                    }}
                    disabled={!!defaultCustomerId || !isOnline}
                    open={customerSelectOpen}
                    onOpenChange={setCustomerSelectOpen}
                  >
                    <SelectTrigger className="flex-1 text-base h-11">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setCustomerFormOpen(true)}
                    disabled={!isOnline}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                {!selectedCustomerId && (
                  <p className="text-xs text-muted-foreground">
                    Select a customer or add new
                  </p>
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
                  className="text-2xl h-16 font-bold"
                  disabled={!isOnline}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">
                    {errors.amount.message}
                  </p>
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
                />
                {errors.date && (
                  <p className="text-xs text-destructive">
                    {errors.date.message}
                  </p>
                )}
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
              <div className="h-4" />
            </form>
          </ScrollArea>

          <SheetFooter className="px-6 py-4 border-t bg-background">
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
                disabled={isSubmitting || !selectedCustomerId || !isOnline}
                className="flex-1 h-12"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {initialData ? "Update" : "Add Udhar"}
              </Button>
            </div>
          </SheetFooter>
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
