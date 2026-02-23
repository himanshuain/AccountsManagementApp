"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, X, Check, Contact } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
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
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingUpiQr, setUploadingUpiQr] = useState(false);

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
    if (uploadingProfile || uploadingUpiQr) return;

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

  const isFormDirty = () => {
    if (isDirty) return true;
    if (profilePicture !== (initialData?.profilePicture || null)) return true;
    if (upiQrCode !== (initialData?.upiQrCode || null)) return true;
    return false;
  };

  const resetAndClose = () => {
    reset();
    setProfilePicture(initialData?.profilePicture || null);
    setUpiQrCode(initialData?.upiQrCode || null);
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

  return (
    <DragCloseDrawer open={open} onOpenChange={v => { if (!v) resetAndClose(); }} beforeClose={handleBeforeClose} height="h-[90vh]">
        {/* Header with action buttons */}
        <div className="border-b px-4 pb-3">
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
            <h3 className="flex-1 text-center text-base font-semibold">{title}</h3>
            <Button
              size="sm"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting || !isOnline || uploadingProfile || uploadingUpiQr}
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
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 py-4">
            {/* Offline warning */}
            {!isOnline && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600">
                You&apos;re offline. Saving is disabled.
              </div>
            )}

            {/* Profile Picture - At Top */}
            <div className="flex justify-center">
              <div className="w-44">
                <ImageUpload
                  value={profilePicture}
                  onChange={setProfilePicture}
                  placeholder="Add Photo"
                  aspectRatio="square"
                  disabled={!isOnline}
                  onUploadingChange={setUploadingProfile}
                  folder="suppliers"
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
                className="h-12 text-base"
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
                    className="h-12 flex-1 text-base"
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
              <h4 className="text-sm font-medium">UPI Payment</h4>

              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  {...register("upiId")}
                  placeholder="example@upi or 9876543210@paytm"
                  className="h-12 text-base"
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
                    onUploadingChange={setUploadingUpiQr}
                    folder="qr-codes"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Additional Details</h4>

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
    </DragCloseDrawer>
  );
}

export default SupplierForm;
