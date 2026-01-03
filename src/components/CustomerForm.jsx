"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, X, Check, Contact } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ImageUpload, MultiImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { useContactPicker } from "@/hooks/useContactPicker";

export function CustomerForm({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  title = "Add Customer",
  showInitialAmount = false,
  initialAmount = "",
  onInitialAmountChange = () => {},
}) {
  const isOnline = useOnlineStatus();
  const { isSupported: contactPickerSupported, isPicking, pickContact } = useContactPicker();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicture, setProfilePicture] = useState(initialData?.profilePicture || null);
  const [khataPhotos, setKhataPhotos] = useState(
    initialData?.khataPhotos || (initialData?.khataPhoto ? [initialData.khataPhoto] : [])
  );
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingKhata, setUploadingKhata] = useState(false);

  const defaultFormValues = {
    name: "",
    phone: "",
    address: "",
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

  useEffect(() => {
    if (open) {
      if (initialData) {
        setProfilePicture(initialData.profilePicture || null);
        setKhataPhotos(
          initialData.khataPhotos || (initialData.khataPhoto ? [initialData.khataPhoto] : [])
        );
        reset({
          name: initialData.name || "",
          phone: initialData.phone || "",
          address: initialData.address || "",
        });
      } else {
        setProfilePicture(null);
        setKhataPhotos([]);
        reset(defaultFormValues);
      }
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async data => {
    if (!isOnline) return;
    if (uploadingProfile || uploadingKhata) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        profilePicture,
        khataPhotos,
      });
      reset();
      setProfilePicture(null);
      setKhataPhotos([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      const initialKhataPhotos =
        initialData?.khataPhotos || (initialData?.khataPhoto ? [initialData.khataPhoto] : []);
      if (
        isDirty ||
        profilePicture !== (initialData?.profilePicture || null) ||
        JSON.stringify(khataPhotos) !== JSON.stringify(initialKhataPhotos)
      ) {
        if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
          return;
        }
      }
      reset();
      setProfilePicture(initialData?.profilePicture || null);
      setKhataPhotos(initialKhataPhotos);
      onOpenChange(false);
    }
  };

  // Handler for Sheet's onOpenChange - only close, don't interfere with opening
  const handleSheetOpenChange = isOpen => {
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
            <SheetTitle className="flex-1 text-center text-base font-semibold">{title}</SheetTitle>
            <Button
              size="sm"
              onClick={handleSubmit(handleFormSubmit)}
              disabled={isSubmitting || !isOnline || uploadingProfile || uploadingKhata}
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

            {/* Profile Picture */}
            <div className="flex justify-center">
              <div className="w-44">
                <ImageUpload
                  value={profilePicture}
                  onChange={setProfilePicture}
                  placeholder="Add Photo"
                  aspectRatio="square"
                  disabled={!isOnline}
                  onUploadingChange={setUploadingProfile}
                  folder="customers"
                />
              </div>
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                {...register("name", {
                  required: "Customer name is required",
                })}
                placeholder="Enter customer name"
                className="h-12 text-base"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="Phone number"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Contact className="h-5 w-5" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Initial Amount (optional) */}
            {showInitialAmount && (
              <div className="space-y-2">
                <Label htmlFor="initialAmount">Initial Udhar Amount (₹)</Label>
                <Input
                  id="initialAmount"
                  type="number"
                  inputMode="numeric"
                  value={initialAmount}
                  onChange={e => onInitialAmountChange(e.target.value)}
                  placeholder="Enter initial lending amount"
                  className="h-14 text-xl font-bold"
                />
                <p className="text-xs text-muted-foreground">
                  This will create an Udhar entry automatically
                </p>
              </div>
            )}

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder="Full address"
                className="h-12 text-base"
              />
            </div>

            {/* <Separator /> */}

            {/* Khata Photos
            <div className="space-y-2">
              <Label>Khata Photos (Ledger/Account Photos)</Label>
              <MultiImageUpload
                value={khataPhotos}
                onChange={setKhataPhotos}
                maxImages={5}
                disabled={!isOnline}
                onUploadingChange={setUploadingKhata}
                folder="khata"
              />
            </div> */}

            {/* Bottom padding for safe area */}
            <div className="h-8" />
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CustomerForm;
