"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ImageUpload, MultiImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { useKeyboardVisible } from "@/hooks/useKeyboardVisible";

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
  const { isKeyboardVisible } = useKeyboardVisible();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicture, setProfilePicture] = useState(
    initialData?.profilePicture || null,
  );
  const [khataPhotos, setKhataPhotos] = useState(
    initialData?.khataPhotos ||
      (initialData?.khataPhoto ? [initialData.khataPhoto] : []),
  );
  const scrollContainerRef = useRef(null);

  const defaultFormValues = {
    name: "",
    phone: "",
    address: "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setProfilePicture(initialData.profilePicture || null);
        setKhataPhotos(
          initialData.khataPhotos ||
            (initialData.khataPhoto ? [initialData.khataPhoto] : []),
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

  const handleFormSubmit = async (data) => {
    if (!isOnline) return;

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
        initialData?.khataPhotos ||
        (initialData?.khataPhoto ? [initialData.khataPhoto] : []);
      if (
        isDirty ||
        profilePicture !== (initialData?.profilePicture || null) ||
        JSON.stringify(khataPhotos) !== JSON.stringify(initialKhataPhotos)
      ) {
        if (
          !confirm("You have unsaved changes. Are you sure you want to close?")
        ) {
          return;
        }
      }
      reset();
      setProfilePicture(initialData?.profilePicture || null);
      setKhataPhotos(initialKhataPhotos);
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
                  ? "Update customer information"
                  : "Add a new customer for Udhar tracking"}
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

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-6 pb-safe"
        >
          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-5 py-4"
          >
            {!isOnline && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                You&apos;re offline. Saving is disabled.
              </div>
            )}

            {/* Profile Picture */}
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

            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                {...register("name", {
                  required: "Customer name is required",
                })}
                placeholder="Enter customer name"
                className="text-base h-12"
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="Phone number"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                className="text-base h-12"
              />
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
                  onChange={(e) => onInitialAmountChange(e.target.value)}
                  placeholder="Enter initial lending amount"
                  className="text-xl h-14 font-bold"
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
                className="text-base h-12"
              />
            </div>

            <Separator />

            {/* Khata Photos */}
            <div className="space-y-2">
              <Label>Khata Photos (Ledger/Account Photos)</Label>
              <MultiImageUpload
                value={khataPhotos}
                onChange={setKhataPhotos}
                maxImages={5}
                disabled={!isOnline}
              />
            </div>

            {/* Action Buttons - Inside scroll area */}
            <div className="pt-4 pb-6 space-y-3">
              <Button
                type="submit"
                disabled={isSubmitting || !isOnline}
                className="w-full h-12 text-base"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {initialData ? "Update Customer" : "Add Customer"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full h-12 text-base"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CustomerForm;
