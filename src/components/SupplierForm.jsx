"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, X } from "lucide-react";
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
import { ImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import useOnlineStatus from "@/hooks/useOnlineStatus";

export function SupplierForm({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  title = "Add Supplier",
}) {
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicture, setProfilePicture] = useState(
    initialData?.profilePicture || null,
  );
  const [upiQrCode, setUpiQrCode] = useState(initialData?.upiQrCode || null);

  const defaultFormValues = {
    companyName: "",
    name: "",
    phone: "",
    address: "",
    gstNumber: "",
    upiId: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: defaultFormValues,
  });

  // Update form when dialog opens
  useEffect(() => {
    if (open) {
      if (initialData) {
        // Editing - populate with existing data
        setProfilePicture(initialData.profilePicture || null);
        setUpiQrCode(initialData.upiQrCode || null);
        reset({
          companyName: initialData.companyName || "",
          name: initialData.name || "",
          phone: initialData.phone || "",
          address: initialData.address || "",
          gstNumber: initialData.gstNumber || "",
          upiId: initialData.upiId || "",
        });
      } else {
        // Adding new - reset to empty
        setProfilePicture(null);
        setUpiQrCode(null);
        reset(defaultFormValues);
      }
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data) => {
    if (!isOnline) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        profilePicture,
        upiQrCode,
      });
      reset();
      setProfilePicture(null);
      setUpiQrCode(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Check if form is dirty and show confirmation
      if (
        isDirty ||
        profilePicture !== (initialData?.profilePicture || null) ||
        upiQrCode !== (initialData?.upiQrCode || null)
      ) {
        if (
          !confirm("You have unsaved changes. Are you sure you want to close?")
        ) {
          return;
        }
      }
      reset();
      setProfilePicture(initialData?.profilePicture || null);
      setUpiQrCode(initialData?.upiQrCode || null);
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
                  ? "Update supplier information"
                  : "Add a new supplier to your records"}
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

            {/* Profile Picture - At Top */}
            <div className="flex justify-center">
              <div className="w-28">
                <ImageUpload
                  value={profilePicture}
                  onChange={setProfilePicture}
                  placeholder="Add Photo"
                  aspectRatio="square"
                  disabled={!isOnline}
                />
              </div>
            </div>

            {/* Supplier Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Supplier Name *</Label>
              <Input
                id="companyName"
                {...register("companyName", {
                  required: "Supplier name is required",
                })}
                placeholder="Enter supplier/shop name"
                className="text-base h-11"
              />
              {errors.companyName && (
                <p className="text-xs text-destructive">
                  {errors.companyName.message}
                </p>
              )}
            </div>

            {/* Person Name & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Contact Person</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Person name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="Phone number"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
            </div>

            <Separator />

            {/* UPI Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">UPI Payment</h4>

              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  {...register("upiId")}
                  placeholder="example@upi or 9876543210@paytm"
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label>QR Code Photo</Label>
                <div className="w-40">
                  <ImageUpload
                    value={upiQrCode}
                    onChange={setUpiQrCode}
                    placeholder="Add QR Code"
                    aspectRatio="square"
                    disabled={!isOnline}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Additional Details</h4>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...register("address")}
                  placeholder="Full address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  {...register("gstNumber")}
                  placeholder="GST number (optional)"
                />
              </div>
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
              disabled={isSubmitting || !isOnline}
              className="flex-1 h-12"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? "Update" : "Add Supplier"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SupplierForm;
