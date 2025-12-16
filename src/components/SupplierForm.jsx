"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, X, Check, Contact } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { useContactPicker } from "@/hooks/useContactPicker";

export function SupplierForm({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  title = "Add Supplier",
}) {
  const isOnline = useOnlineStatus();
  const { isSupported: contactPickerSupported, isPicking, pickContact } = useContactPicker();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicture, setProfilePicture] = useState(initialData?.profilePicture || null);
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
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: defaultFormValues,
  });

  // Handle contact picker selection
  const handlePickContact = async () => {
    const contact = await pickContact();
    if (contact) {
      if (contact.phone) {
        setValue("phone", contact.phone, { shouldDirty: true });
      }
      // Optionally fill name if empty
      if (contact.name) {
        const currentName = document.getElementById("name")?.value;
        if (!currentName) {
          setValue("name", contact.name, { shouldDirty: true });
        }
      }
    }
  };

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

  const handleFormSubmit = async data => {
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
        if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
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
        onSwipeClose={handleClose}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header with action buttons */}
        <SheetHeader className="px-4 pb-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-9 px-3"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <SheetTitle className="text-base font-semibold flex-1 text-center">{title}</SheetTitle>
            <Button
              size="sm"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting || !isOnline}
              className="h-9 px-3"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  {initialData ? "Save" : "Add"}
                </>
              )}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-safe">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 py-4">
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
                className="text-base h-12"
              />
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName.message}</p>
              )}
            </div>

            {/* Person Name & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Contact Person</Label>
                <Input id="name" {...register("name")} placeholder="Person name" className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="flex gap-1">
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="Phone"
                    type="number"
                    inputMode="numeric"
                    className="text-base h-12 flex-1"
                  />
                  {contactPickerSupported && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12 shrink-0"
                      onClick={handlePickContact}
                      disabled={isPicking || !isOnline}
                      title="Pick from contacts"
                    >
                      {isPicking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Contact className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
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
                  className="text-base h-12"
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
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  {...register("gstNumber")}
                  placeholder="GST number (optional)"
                  className="h-12"
                />
              </div>
            </div>

            {/* Bottom padding for safe area */}
            <div className="h-8" />
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SupplierForm;
