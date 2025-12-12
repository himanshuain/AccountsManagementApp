"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: initialData || {
      name: "",
      phone: "",
      email: "",
      address: "",
      companyName: "",
      gstNumber: "",
      upiId: "",
      bankDetails: {
        bankName: "",
        accountNumber: "",
        ifscCode: "",
      },
    },
  });

  // Update state when initialData changes
  useEffect(() => {
    if (open && initialData) {
      setProfilePicture(initialData.profilePicture || null);
      setUpiQrCode(initialData.upiQrCode || null);
      reset(initialData);
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
      reset();
      setProfilePicture(initialData?.profilePicture || null);
      setUpiQrCode(initialData?.upiQrCode || null);
      onOpenChange(false);
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
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
            {/* Profile Picture */}
            <div className="flex justify-center">
              <div className="w-32">
                <ImageUpload
                  value={profilePicture}
                  onChange={setProfilePicture}
                  placeholder="Add Photo"
                  aspectRatio="square"
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Person Name *</Label>
                  <Input
                    id="name"
                    {...register("name", { required: "Name is required" })}
                    placeholder="Person name"
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    {...register("phone", { required: "Phone is required" })}
                    placeholder="Phone number"
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Supplier Name</Label>
                <Input id="companyName" {...register("companyName")} placeholder="Supplier name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register("address")} placeholder="Full address" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input id="gstNumber" {...register("gstNumber")} placeholder="GST number" />
              </div>
            </div>

            <Separator />

            {/* Bank Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Bank Details</h4>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  {...register("bankDetails.bankName")}
                  placeholder="Bank name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    {...register("bankDetails.accountNumber")}
                    placeholder="Account number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    {...register("bankDetails.ifscCode")}
                    placeholder="IFSC code"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* UPI Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm">UPI Payment Details</h4>

              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  {...register("upiId")}
                  placeholder="example@upi or phone@paytm"
                />
              </div>

              <div className="space-y-2">
                <Label>UPI QR Code / Scanner Photo</Label>
                <div className="w-40">
                  <ImageUpload
                    value={upiQrCode}
                    onChange={setUpiQrCode}
                    placeholder="Add QR Code"
                    aspectRatio="square"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a photo of the supplier&apos;s UPI QR code for quick payments
                </p>
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(handleFormSubmit)} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update" : "Add Supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SupplierForm;
