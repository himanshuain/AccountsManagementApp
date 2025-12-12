"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Camera, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const cameraInputRef = useRef(null);

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

  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setKhataPhotos((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
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
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {initialData
                ? "Update Udhar details"
                : "Record a new Udhar (lending) entry"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] px-6">
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
                    onValueChange={setSelectedCustomerId}
                    disabled={!!defaultCustomerId || !isOnline}
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
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <MultiImageUpload
                      value={khataPhotos}
                      onChange={setKhataPhotos}
                      maxImages={5}
                      disabled={!isOnline}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={cameraInputRef}
                      onChange={handleCameraCapture}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cameraInputRef.current?.click()}
                      className="gap-2"
                      disabled={!isOnline}
                    >
                      <Camera className="h-4 w-4" />
                      Camera
                    </Button>
                  </div>
                </div>
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

              {/* Date & Item */}
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="itemDescription">Item/Description</Label>
                  <Input
                    id="itemDescription"
                    {...register("itemDescription")}
                    placeholder="Clothes etc."
                    disabled={!isOnline}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  {...register("notes")}
                  placeholder="Any additional notes"
                  disabled={!isOnline}
                />
              </div>
            </form>
          </ScrollArea>

          <DialogFooter className="px-6 pb-6">
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(handleFormSubmit)}
                disabled={isSubmitting || !selectedCustomerId || !isOnline}
                className="flex-1"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {initialData ? "Update" : "Add Udhar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Form Dialog */}
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
