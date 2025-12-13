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
import { ImageUpload, MultiImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import useOnlineStatus from "@/hooks/useOnlineStatus";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicture, setProfilePicture] = useState(
    initialData?.profilePicture || null,
  );
  const [khataPhotos, setKhataPhotos] = useState(
    initialData?.khataPhotos ||
      (initialData?.khataPhoto ? [initialData.khataPhoto] : []),
  );

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
                className="text-base h-11"
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
                className="text-base h-11"
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
                className="text-base"
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
              {initialData ? "Update" : "Add Customer"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default CustomerForm;
