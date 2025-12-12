"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Camera } from "lucide-react";
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
import { ImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import useOnlineStatus from "@/hooks/useOnlineStatus";

export function CustomerForm({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  title = "Add Customer",
}) {
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicture, setProfilePicture] = useState(
    initialData?.profilePicture || null,
  );
  const [khataPhoto, setKhataPhoto] = useState(initialData?.khataPhoto || null);
  const cameraInputRef = useRef(null);
  const khataCameraRef = useRef(null);

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
        setKhataPhoto(initialData.khataPhoto || null);
        reset({
          name: initialData.name || "",
          phone: initialData.phone || "",
          address: initialData.address || "",
        });
      } else {
        setProfilePicture(null);
        setKhataPhoto(null);
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
        khataPhoto,
      });
      reset();
      setProfilePicture(null);
      setKhataPhoto(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      if (
        isDirty ||
        profilePicture !== (initialData?.profilePicture || null) ||
        khataPhoto !== (initialData?.khataPhoto || null)
      ) {
        if (
          !confirm("You have unsaved changes. Are you sure you want to close?")
        ) {
          return;
        }
      }
      reset();
      setProfilePicture(initialData?.profilePicture || null);
      setKhataPhoto(initialData?.khataPhoto || null);
      onOpenChange(false);
    }
  };

  const handleCameraCapture = (e, setImage) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update customer information"
              : "Add a new customer for Udhar tracking"}
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

            {/* Khata Photo */}
            <div className="space-y-2">
              <Label>Khata Photo (Ledger/Account Photo)</Label>
              <div className="flex items-start gap-3">
                <div className="w-32">
                  <ImageUpload
                    value={khataPhoto}
                    onChange={setKhataPhoto}
                    placeholder="Add Khata"
                    aspectRatio="square"
                    disabled={!isOnline}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={khataCameraRef}
                    onChange={(e) => handleCameraCapture(e, setKhataPhoto)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => khataCameraRef.current?.click()}
                    className="gap-2"
                    disabled={!isOnline}
                  >
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Take photo of khata/ledger
                  </p>
                </div>
              </div>
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
              disabled={isSubmitting || !isOnline}
              className="flex-1"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {initialData ? "Update" : "Add Customer"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerForm;
