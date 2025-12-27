"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Camera, ImagePlus, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageViewer, ImageGalleryViewer } from "./ImageViewer";
import { compressImage } from "@/lib/image-compression";
import { getImageUrls, isDataUrl, isCdnConfigured } from "@/lib/image-url";

export function ImageUpload({
  value,
  onChange,
  className,
  placeholder = "Upload Image",
  aspectRatio = "square",
  disabled = false,
  onUploadingChange,
  folder = "general",
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [optimizedUrls, setOptimizedUrls] = useState({ src: "", lqip: "", medium: "" });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const setUploadingState = state => {
    setIsUploading(state);
    onUploadingChange?.(state);
  };

  // Sync preview with value and get optimized URLs
  useEffect(() => {
    if (value) {
      setPreview(value);
      // Get optimized URLs (handles both storage keys and legacy URLs)
      if (!isDataUrl(value)) {
        const urls = getImageUrls(value);
        setOptimizedUrls(urls);
        setIsImageLoaded(false);
      } else {
        setOptimizedUrls({ src: value, lqip: value, medium: value, original: value });
        setIsImageLoaded(true);
      }
    } else {
      setPreview(null);
      setOptimizedUrls({ src: "", lqip: "", medium: "", original: "" });
    }
  }, [value]);

  const handleFileSelect = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingState(true);

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
      formData.append("folder", folder);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // Store the storage key (not the full URL)
        const storageKey = result.storageKey || result.url;
        onChange?.(storageKey);
        setPreview(storageKey);
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
      setUploadingState(false);
    }
  };

  const handleRemove = async e => {
    e.stopPropagation();
    
    // If the current value is a storage key (not data URL), delete it from R2
    if (value && typeof value === "string" && !isDataUrl(value)) {
      try {
        // Delete from R2 in background - don't block UI
        fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storageKey: value }),
        }).catch(err => console.error("Failed to delete image from R2:", err));
      } catch (err) {
        console.error("Failed to delete image:", err);
      }
    }
    
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

  // Determine display URL
  const displayUrl = isDataUrl(preview) ? preview : (optimizedUrls.medium || optimizedUrls.src || "");
  const lqipUrl = isDataUrl(preview) ? preview : optimizedUrls.lqip;
  const isBase64 = isDataUrl(preview);

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
            {!isBase64 && lqipUrl && (
              <img
                src={lqipUrl}
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
              src={displayUrl}
              alt="Preview"
              className={cn(
                "h-full w-full object-cover transition-opacity duration-500",
                !isImageLoaded && !isBase64 ? "opacity-0" : "opacity-100"
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

      {/* Image Viewer - pass original URL for full quality */}
      <ImageViewer
        src={optimizedUrls.original || preview}
        alt="Preview"
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </>
  );
}

export function MultiImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  disabled = false,
  onUploadingChange,
  folder = "general",
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const setUploadingState = state => {
    setIsUploading(state);
    onUploadingChange?.(state);
  };

  const handleFilesSelect = async (e, fromCamera = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    const filesToUpload = files.slice(0, remainingSlots);

    setUploadingState(true);
    const newKeys = [];

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
        formData.append("folder", folder);

        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            // Store the storage key (not the full URL)
            newKeys.push(result.storageKey || result.url);
          } else {
            newKeys.push(localUrl);
          }
        } catch {
          newKeys.push(localUrl);
        }
      } catch (error) {
        console.error("File processing failed:", error);
      }
    }

    onChange?.([...value, ...newKeys]);
    setUploadingState(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleRemove = async index => {
    const removedKey = value[index];
    
    // If the removed item is a storage key (not data URL), delete it from R2
    if (removedKey && typeof removedKey === "string" && !isDataUrl(removedKey)) {
      try {
        // Delete from R2 in background - don't block UI
        fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storageKey: removedKey }),
        }).catch(err => console.error("Failed to delete image from R2:", err));
      } catch (err) {
        console.error("Failed to delete image:", err);
      }
    }
    
    const newValue = value.filter((_, i) => i !== index);
    onChange?.(newValue);
  };

  const handleViewImage = index => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  // Get resolved URLs for viewer
  const viewerImages = value.map(v => {
    const urls = getImageUrls(v);
    return urls.original || v;
  });

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
          {value.map((storageKey, index) => {
            const urls = getImageUrls(storageKey);
            const isBase64 = isDataUrl(storageKey);
            return (
              <div
                key={index}
                className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg border bg-muted"
                onClick={() => handleViewImage(index)}
              >
                {/* Render optimized thumbnail with LQIP */}
                <MultiImageThumbnail
                  storageKey={storageKey}
                  urls={urls}
                  index={index}
                  isBase64={isBase64}
                />
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
        images={viewerImages}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </>
  );
}

// Helper component for optimized thumbnails in MultiImageUpload
function MultiImageThumbnail({ storageKey, urls, index, isBase64 }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Get the resolved URL - for base64, use as-is; otherwise use CDN URLs
  const imageSrc = isBase64 ? storageKey : (urls.thumbnail || urls.src || urls.original || storageKey);

  if (hasError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        <span className="mt-1 text-xs text-muted-foreground">Failed to load</span>
      </div>
    );
  }

  return (
    <>
      {/* LQIP blurred background - shows while thumbnail loads */}
      {!isBase64 && urls.lqip && !hasError && (
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
        src={imageSrc}
        alt={`Image ${index + 1}`}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          !isLoaded && !isBase64 ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </>
  );
}

export default ImageUpload;
