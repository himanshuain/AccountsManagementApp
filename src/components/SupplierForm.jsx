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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "./ImageUpload";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const SUPPLIER_CATEGORIES = [
  { value: 'fabric', label: 'Fabric', color: 'category-fabric' },
  { value: 'accessories', label: 'Accessories', color: 'category-accessories' },
  { value: 'premium', label: 'Premium', color: 'category-premium' },
  { value: 'regular', label: 'Regular', color: 'category-regular' },
];

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
  const [category, setCategory] = useState(initialData?.category || '');

  const defaultFormValues = {
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
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
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
        setCategory(initialData.category || '');
        reset({
          name: initialData.name || "",
          phone: initialData.phone || "",
          email: initialData.email || "",
          address: initialData.address || "",
          companyName: initialData.companyName || "",
          gstNumber: initialData.gstNumber || "",
          upiId: initialData.upiId || "",
          bankDetails: {
            bankName: initialData.bankDetails?.bankName || "",
            accountNumber: initialData.bankDetails?.accountNumber || "",
            ifscCode: initialData.bankDetails?.ifscCode || "",
          },
        });
      } else {
        // Adding new - reset to empty
        setProfilePicture(null);
        setUpiQrCode(null);
        setCategory('');
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
        category,
      });
      reset();
      setProfilePicture(null);
      setUpiQrCode(null);
      setCategory('');
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
      setCategory(initialData?.category || '');
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

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className={`inline-flex items-center gap-2`}>
                          <span className={`w-2 h-2 rounded-full ${cat.color.replace('category-', 'bg-')}`} 
                                style={{
                                  backgroundColor: cat.value === 'fabric' ? '#60a5fa' :
                                                  cat.value === 'accessories' ? '#a78bfa' :
                                                  cat.value === 'premium' ? '#fbbf24' : '#4ade80'
                                }} />
                          {cat.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Input id="upiId" {...register("upiId")} placeholder="example@upi or phone@paytm" />
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
