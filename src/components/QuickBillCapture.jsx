"use client";

import { useState, useRef } from "react";
import { Camera, X, Plus, Check, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function QuickBillCapture({ suppliers, onCapture, disabled, variant = "button" }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: select supplier, 2: capture photos
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleOpen = () => {
    setOpen(true);
    setStep(1);
    setSelectedSupplier("");
    setCapturedImages([]);
  };

  const handleClose = () => {
    setOpen(false);
    setStep(1);
    setSelectedSupplier("");
    setCapturedImages([]);
  };

  const handleSupplierSelect = () => {
    if (selectedSupplier) {
      setStep(2);
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e, isCamera = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsCapturing(true);

    try {
      const newImages = [];

      for (const file of files) {
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        newImages.push({
          file,
          preview: previewUrl,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }

      setCapturedImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error("Error processing images:", error);
    } finally {
      setIsCapturing(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const handleRemoveImage = imageId => {
    setCapturedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // Revoke URL for removed image
      const removed = prev.find(img => img.id === imageId);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };

  const handleDone = () => {
    if (capturedImages.length > 0 && selectedSupplier) {
      const supplier = suppliers.find(s => s.id === selectedSupplier);
      onCapture({
        supplierId: selectedSupplier,
        supplierName: supplier?.name,
        images: capturedImages.map(img => img.file),
      });
      handleClose();
    }
  };

  const selectedSupplierName = suppliers.find(s => s.id === selectedSupplier)?.name;

  const TileButton = () => (
    <Card
      className={cn(
        "cursor-pointer border-2 transition-colors",
        disabled || suppliers.length === 0
          ? "cursor-not-allowed opacity-50"
          : "border-primary/20 bg-primary/5 hover:border-primary/50 hover:bg-primary/5"
      )}
      onClick={disabled || suppliers.length === 0 ? undefined : handleOpen}
    >
      <CardContent className="flex h-full min-h-[100px] flex-col items-center justify-center gap-2 p-4">
        <div className="rounded-full bg-primary p-3">
          <Camera className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-center text-sm font-medium">Capture Bills</span>
        <span className="text-[10px] text-muted-foreground">Vyapari bills</span>
      </CardContent>
    </Card>
  );

  const ButtonTrigger = () => (
    <Button
      variant="outline"
      onClick={handleOpen}
      disabled={disabled || suppliers.length === 0}
      className="gap-2"
    >
      <Camera className="h-4 w-4" />
      <span className="hidden sm:inline">Quick Capture</span>
    </Button>
  );

  return (
    <>
      {variant === "tile" ? <TileButton /> : <ButtonTrigger />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Capture Vyapari Bills
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? "Select a vyapari to attach the bills to"
                : `Capture bills for ${selectedSupplierName}`}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Vyapari</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a vyapari..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center gap-2">
                          {supplier.profilePicture ? (
                            <img
                              src={supplier.profilePicture}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-medium">
                              {supplier.name?.charAt(0)}
                            </div>
                          )}
                          {supplier.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSupplierSelect} disabled={!selectedSupplier}>
                  Next
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-4">
              {/* Captured Images Grid */}
              {capturedImages.length > 0 && (
                <div className="space-y-2">
                  <Label>Captured Bills ({capturedImages.length})</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {capturedImages.map(img => (
                      <div
                        key={img.id}
                        className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted"
                      >
                        <img
                          src={img.preview}
                          alt="Captured bill"
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() => handleRemoveImage(img.id)}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Capture Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={handleCameraCapture}
                  disabled={isCapturing}
                >
                  <Camera className="h-8 w-8" />
                  <span className="text-sm">Take Photo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={handleGallerySelect}
                  disabled={isCapturing}
                >
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm">From Gallery</span>
                </Button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => handleFileChange(e, true)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => handleFileChange(e, false)}
              />

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setStep(1)} className="sm:mr-auto">
                  Back
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDone}
                  disabled={capturedImages.length === 0}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Done ({capturedImages.length})
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default QuickBillCapture;
