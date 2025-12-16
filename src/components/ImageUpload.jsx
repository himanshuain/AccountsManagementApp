"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Camera, ImagePlus, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageViewer, ImageGalleryViewer } from "./ImageViewer";
import { compressImage } from "@/lib/image-compression";
import { getOptimizedImageUrl, isImageKitConfigured } from "@/lib/imagekit";

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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [optimizedUrls, setOptimizedUrls] = useState({ src: "", lqip: "" });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Sync preview with value and get optimized URLs
  useEffect(() => {
    if (value) {
      setPreview(value);
      if (!value.startsWith("data:") && value.includes("ik.imagekit.io")) {
        const urls = getOptimizedImageUrl(value);
        setOptimizedUrls(urls);
        setIsImageLoaded(false);
      } else {
        setOptimizedUrls({ src: value, lqip: value, medium: value });
        setIsImageLoaded(true);
      }
    } else {
      setPreview(null);
      setOptimizedUrls({ src: "", lqip: "", medium: "" });
    }
  }, [value]);

  const handleFileSelect = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
        maxSizeKB: 500,
      });

      // Create local preview from compressed file
      const reader = new FileReader();
      reader.onload = e => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(compressedFile);

      // Upload compressed file
      const formData = new FormData();
      formData.append("file", compressedFile);

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
        const localUrl = await new Promise(resolve => {
          const r = new FileReader();
          r.onload = e => resolve(e.target.result);
          r.readAsDataURL(compressedFile);
        });
        onChange?.(localUrl);
        setPreview(localUrl);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      // Keep local preview for offline mode
      onChange?.(preview);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = e => {
    e.stopPropagation();
    setPreview(null);
    onChange?.(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleViewImage = e => {
    e.stopPropagation();
    if (preview) {
      setViewerOpen(true);
    }
  };

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
  };

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Hidden inputs for camera and gallery */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {preview ? (
          <div
            className={cn(
              "group relative cursor-pointer overflow-hidden rounded-lg border bg-muted",
              aspectClasses[aspectRatio]
            )}
            onClick={handleViewImage}
          >
            {/* LQIP blurred background - shows while main image loads */}
            {!preview.startsWith("data:") && optimizedUrls.lqip && (
              <img
                src={optimizedUrls.lqip}
                alt=""
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 h-full w-full scale-110 object-cover transition-opacity duration-500",
                  isImageLoaded ? "opacity-0" : "opacity-100 blur-xl"
                )}
              />
            )}
            {/* Main image - use medium quality for form previews */}
            <img
              src={
                preview.startsWith("data:")
                  ? preview
                  : optimizedUrls.medium || optimizedUrls.src || preview
              }
              alt="Preview"
              className={cn(
                "h-full w-full object-cover transition-opacity duration-500",
                !isImageLoaded && !preview.startsWith("data:") ? "opacity-0" : "opacity-100"
              )}
              onLoad={() => setIsImageLoaded(true)}
              loading="lazy"
            />
            {/* Hover overlay with view hint */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <Expand className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(e);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "w-full rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50",
              "flex flex-col items-center justify-center gap-3 p-4",
              "disabled:cursor-not-allowed disabled:opacity-50",
              aspectClasses[aspectRatio]
            )}
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="rounded-full bg-primary/10 p-3">
                  <ImageIcon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-center text-sm text-muted-foreground">{placeholder}</span>
                {/* Camera and Gallery buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={disabled || isUploading}
                    className="gap-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={disabled || isUploading}
                    className="gap-1.5"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Gallery
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Image Viewer */}
      <ImageViewer src={preview} alt="Preview" open={viewerOpen} onOpenChange={setViewerOpen} />
    </>
  );
}

export function MultiImageUpload({ value = [], onChange, maxImages = 5, disabled = false }) {
  const [isUploading, setIsUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handleFilesSelect = async (e, fromCamera = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    const filesToUpload = files.slice(0, remainingSlots);

    setIsUploading(true);
    const newUrls = [];

    for (const file of filesToUpload) {
      try {
        // Compress image before upload
        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
          maxSizeKB: 500,
        });

        // Create local preview first
        const localUrl = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(compressedFile);
        });

        // Try to upload
        const formData = new FormData();
        formData.append("file", compressedFile);

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
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleRemove = index => {
    const newValue = value.filter((_, i) => i !== index);
    onChange?.(newValue);
  };

  const handleViewImage = index => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Hidden inputs for camera and gallery */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={e => handleFilesSelect(e, true)}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={e => handleFilesSelect(e, false)}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {/* Image grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((url, index) => {
            const urls = url.startsWith("data:")
              ? { src: url, lqip: url, thumbnail: url }
              : getOptimizedImageUrl(url);
            return (
              <div
                key={index}
                className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg border bg-muted"
                onClick={() => handleViewImage(index)}
              >
                {/* Render optimized thumbnail with LQIP */}
                <MultiImageThumbnail url={url} urls={urls} index={index} />
                {/* Hover overlay */}
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <Expand className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-1 top-1 z-20 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}

          {/* Add more buttons */}
          {value.length < maxImages && (
            <div
              className={cn(
                "aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25",
                "flex flex-col items-center justify-center gap-2 p-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={disabled || isUploading}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={disabled || isUploading}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-center text-[10px] text-muted-foreground">Add Photo</span>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {value.length} of {maxImages} images • Tap to view
        </p>
      </div>

      {/* Gallery Viewer */}
      <ImageGalleryViewer
        images={value}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </>
  );
}

// Helper component for optimized thumbnails in MultiImageUpload
function MultiImageThumbnail({ url, urls, index }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const isDataUrl = url.startsWith("data:");

  return (
    <>
      {/* LQIP blurred background - shows while thumbnail loads */}
      {!isDataUrl && urls.lqip && (
        <img
          src={urls.lqip}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 h-full w-full scale-110 object-cover transition-opacity duration-500",
            isLoaded ? "opacity-0" : "opacity-100 blur-xl"
          )}
        />
      )}
      {/* Thumbnail image */}
      <img
        src={isDataUrl ? url : urls.thumbnail || url}
        alt={`Image ${index + 1}`}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          !isLoaded && !isDataUrl ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
      />
    </>
  );
}

export default ImageUpload;
