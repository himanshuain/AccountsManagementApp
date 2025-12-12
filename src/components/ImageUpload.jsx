"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImageUpload({
  value,
  onChange,
  className,
  placeholder = "Upload Image",
  aspectRatio = "square",
  disabled = false,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const inputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { url } = await response.json();
        onChange?.(url);
        setPreview(url);
      } else {
        // Keep local preview for offline mode
        onChange?.(preview);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      // Keep local preview for offline mode
      onChange?.(preview);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange?.(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {preview ? (
        <div
          className={cn(
            "relative rounded-lg overflow-hidden border bg-muted",
            aspectClasses[aspectRatio],
          )}
        >
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className={cn(
            "w-full rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50",
            "flex flex-col items-center justify-center gap-2 p-6",
            "hover:border-primary/50 hover:bg-muted transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            aspectClasses[aspectRatio],
          )}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              <div className="rounded-full bg-primary/10 p-3">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">
                {placeholder}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function MultiImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  disabled = false,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFilesSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    const filesToUpload = files.slice(0, remainingSlots);

    setIsUploading(true);
    const newUrls = [];

    for (const file of filesToUpload) {
      try {
        // Create local preview first
        const localUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });

        // Try to upload
        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const { url } = await response.json();
            newUrls.push(url);
          } else {
            newUrls.push(localUrl);
          }
        } catch {
          newUrls.push(localUrl);
        }
      } catch (error) {
        console.error("File processing failed:", error);
      }
    }

    onChange?.([...value, ...newUrls]);
    setIsUploading(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemove = (index) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange?.(newValue);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Image grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {value.map((url, index) => (
          <div
            key={index}
            className="relative aspect-video rounded-lg overflow-hidden border bg-muted"
          >
            <img
              src={url}
              alt={`Bill ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {!disabled && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => handleRemove(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}

        {/* Add more button */}
        {value.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || isUploading}
            className={cn(
              "aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25",
              "flex flex-col items-center justify-center gap-1",
              "hover:border-primary/50 hover:bg-muted/50 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add Bill</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {value.length} of {maxImages} images uploaded
      </p>
    </div>
  );
}

export default ImageUpload;
