"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Image as ImageIcon, Check, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import useSuppliers from "@/hooks/useSuppliers";
import { compressImage } from "@/lib/image-compression";
import { toast } from "sonner";

function ShareTargetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { suppliers, loading: suppliersLoading } = useSuppliers();

  const [sharedImages, setSharedImages] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [shareType, setShareType] = useState("payment"); // payment, bill
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we have shared files in session storage (set by service worker)
    const checkForSharedFiles = async () => {
      try {
        // Try to get files from the cache (set by service worker)
        const cache = await caches.open("shared-images");
        const keys = await cache.keys();

        if (keys.length > 0) {
          const images = [];
          for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              images.push({
                url,
                blob,
                name: request.url.split("/").pop() || "shared-image.jpg",
              });
            }
          }
          setSharedImages(images);

          // Clear the cache after reading
          for (const request of keys) {
            await cache.delete(request);
          }
        }
      } catch (error) {
        console.error("Error reading shared files:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Also check for URL parameters
    const title = searchParams.get("title");
    const text = searchParams.get("text");
    const url = searchParams.get("url");

    if (title || text || url) {
      console.log("Shared via URL params:", { title, text, url });
    }

    checkForSharedFiles();
  }, [searchParams]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = [];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      newImages.push({
        url,
        blob: file,
        name: file.name,
      });
    }
    setSharedImages((prev) => [...prev, ...newImages]);
  };

  const handleRemoveImage = (index) => {
    setSharedImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].url);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleSave = async () => {
    if (!selectedSupplierId || sharedImages.length === 0) {
      toast.error("Please select a supplier and add images");
      return;
    }

    setIsProcessing(true);

    try {
      const uploadedUrls = [];

      for (const image of sharedImages) {
        // Compress image
        const compressedFile = await compressImage(image.blob, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
          maxSizeKB: 500,
        });

        // Upload
        const formData = new FormData();
        formData.append("file", compressedFile);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const { url } = await response.json();
          uploadedUrls.push(url);
        }
      }

      if (uploadedUrls.length > 0) {
        // Store in session storage for the supplier page to pick up
        sessionStorage.setItem(
          "sharedPaymentData",
          JSON.stringify({
            supplierId: selectedSupplierId,
            type: shareType,
            images: uploadedUrls,
            timestamp: Date.now(),
          }),
        );

        toast.success(`${uploadedUrls.length} image(s) ready to attach`);
        router.push(`/suppliers/${selectedSupplierId}`);
      } else {
        toast.error("Failed to upload images");
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save images");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    // Clean up blob URLs
    sharedImages.forEach((img) => URL.revokeObjectURL(img.url));
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading shared content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Share to Shop Manager</h1>
          <Button variant="ghost" size="icon" onClick={handleCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Shared Images */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Shared Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sharedImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {sharedImages.map((img, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border bg-muted"
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mb-4">
                  No images shared. You can add images manually.
                </p>
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Select Images
                    </span>
                  </Button>
                </label>
              </div>
            )}

            {sharedImages.length > 0 && (
              <div className="mt-3">
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full"
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Add More
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label>Select Supplier</Label>
              <Select
                value={selectedSupplierId}
                onValueChange={setSelectedSupplierId}
                disabled={suppliersLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.companyName || supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Share Type */}
            <div className="space-y-2">
              <Label>Image Type</Label>
              <Select value={shareType} onValueChange={setShareType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment Receipt</SelectItem>
                  <SelectItem value="bill">Bill / Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1 h-12"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isProcessing || !selectedSupplierId || sharedImages.length === 0
            }
            className="flex-1 h-12"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Continue
              </>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-center text-muted-foreground">
          Share images from your UPI app or gallery to attach them as payment
          receipts or bills.
        </p>
      </div>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ShareTargetContent />
    </Suspense>
  );
}
