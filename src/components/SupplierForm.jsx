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

export function SupplierForm({
  open,
  onOpenChange,
  onSubmit,
  initialData = null,
  title = "Add Supplier",
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicture, setProfilePicture] = useState(initialData?.profilePicture || null);
  const [upiQrCode, setUpiQrCode] = useState(initialData?.upiQrCode || null);
  const cameraInputRef = useRef(null);

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

  const handleFormSubmit = async data => {
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
      if (isDirty || profilePicture !== (initialData?.profilePicture || null) || upiQrCode !== (initialData?.upiQrCode || null)) {
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

  // Handle camera capture for QR code
  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUpiQrCode(reader.result);
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
            {initialData ? "Update supplier information" : "Add a new supplier to your records"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 py-4">
            {/* Supplier Name - First */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Supplier Name *</Label>
              <Input 
                id="companyName" 
                {...register("companyName", { required: "Supplier name is required" })} 
                placeholder="Enter supplier/shop name"
                className="text-base"
              />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
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
                />
              </div>
            </div>

            <Separator />

            {/* UPI Details - Moved up */}
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
                <div className="flex items-start gap-3">
                  <div className="w-32">
                    <ImageUpload
                      value={upiQrCode}
                      onChange={setUpiQrCode}
                      placeholder="Add QR"
                      aspectRatio="square"
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
                    >
                      <Camera className="h-4 w-4" />
                      Camera
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Take photo of QR code
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Profile Picture */}
            <div className="space-y-2">
              <Label>Profile Photo (Optional)</Label>
              <div className="flex justify-center">
                <div className="w-24">
                  <ImageUpload
                    value={profilePicture}
                    onChange={setProfilePicture}
                    placeholder="Photo"
                    aspectRatio="square"
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
                <Input id="address" {...register("address")} placeholder="Full address" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input id="gstNumber" {...register("gstNumber")} placeholder="GST number (optional)" />
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
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Update" : "Add Supplier"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SupplierForm;
