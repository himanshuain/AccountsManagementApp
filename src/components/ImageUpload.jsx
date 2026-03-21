"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, X, Image as ImageIcon, Loader2, Camera, ImagePlus, Expand, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageViewer, ImageGalleryViewer } from "./PhotoViewer";
import { compressImage, compressForHD } from "@/lib/image-compression";
import { getImageUrls, isDataUrl, resolveImageUrl } from "@/lib/image-url";

/** POST /api/upload with XMLHttpRequest so upload progress is available. */
function uploadFormDataWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.timeout = 120000;
    xhr.upload.onprogress = event => {
      if (!onProgress) return;
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      } else {
        onProgress(null);
      }
    };
    xhr.onload = () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText || "{}");
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        reject(new Error(body.error || `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Try again."));
    xhr.send(formData);
  });
}

/** @param {{ phase: 'idle'|'compressing'|'uploading'|'success'|'error'; progress: number|null; label?: string; errorMessage?: string }} props */
function UploadStatusBar({ phase, progress, label, errorMessage }) {
  if (phase === "idle") return null;

  return (
    <div className="mt-2 space-y-1.5" role="status" aria-live="polite">
      {(phase === "compressing" || phase === "uploading") && (
        <>
          <p className="text-xs text-muted-foreground">{label || (phase === "compressing" ? "Preparing image…" : "Uploading…")}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            {phase === "compressing" || progress === null ? (
              <div className="h-full w-full rounded-full bg-primary/30 animate-pulse" />
            ) : (
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            )}
          </div>
          {phase === "uploading" && progress !== null && (
            <p className="text-[10px] tabular-nums text-muted-foreground">{progress}%</p>
          )}
        </>
      )}
      {phase === "success" && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {label || "Upload complete"}
        </p>
      )}
      {phase === "error" && errorMessage && (
        <p className="text-xs font-medium leading-snug text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}

export function ImageUpload({
  value,
  onChange,
  className,
  placeholder = "Upload Image",
  aspectRatio = "square",
  disabled = false,
  onUploadingChange,
  folder = "general",
  showHDToggle = true, // Show HD toggle by default
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(value || null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [optimizedUrls, setOptimizedUrls] = useState({ src: "", lqip: "", medium: "" });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isHDMode, setIsHDMode] = useState(false); // HD mode toggle state
  const [uploadPhase, setUploadPhase] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadError, setUploadError] = useState("");
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const successTimerRef = useRef(null);

  const setUploadingState = state => {
    setIsUploading(state);
    onUploadingChange?.(state);
  };

  const scheduleResetStatus = useCallback(() => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setUploadPhase("idle");
      setUploadProgress(null);
      setUploadLabel("");
      setUploadError("");
      successTimerRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

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

    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setUploadError("");
    setUploadPhase("compressing");
    setUploadLabel("Optimizing image…");
    setUploadProgress(null);
    setUploadingState(true);

    try {
      let compressedFile;
      if (isHDMode) {
        compressedFile = await compressForHD(file);
        console.log(`[HD Upload] Original: ${Math.round(file.size/1024)}KB → Compressed: ${Math.round(compressedFile.size/1024)}KB`);
      } else {
        compressedFile = await compressImage(file, {
          maxWidth: 2048,
          maxHeight: 2048,
          quality: 0.9,
          maxSizeKB: 800,
          useWebP: false, // Keep JPEG for better compatibility
        });
      }

      const reader = new FileReader();
      reader.onload = ev => {
        setPreview(ev.target.result);
      };
      reader.readAsDataURL(compressedFile);

      setUploadPhase("uploading");
      setUploadLabel("Uploading…");
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("folder", folder);

      const result = await uploadFormDataWithProgress(formData, pct => {
        setUploadProgress(pct);
      });

      const storageKey = result.storageKey || result.url;
      onChange?.(storageKey);
      setPreview(storageKey);
      setUploadPhase("success");
      setUploadProgress(100);
      setUploadLabel("Image uploaded successfully");
      scheduleResetStatus();
    } catch (error) {
      console.error("Upload failed:", error);
      const message = error?.message || "Upload failed. Check your connection and try again.";
      setUploadPhase("error");
      setUploadProgress(null);
      setUploadLabel("");
      setUploadError(message);
      setPreview(value || null);
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
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setUploadPhase("idle");
    setUploadProgress(null);
    setUploadLabel("");
    setUploadError("");
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
  const displayUrl = isDataUrl(preview) ? preview : optimizedUrls.medium || optimizedUrls.src || "";
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
              loading="eager"
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
                {/* HD Toggle */}
                {showHDToggle && (
                  <button
                    type="button"
                    onClick={() => setIsHDMode(!isHDMode)}
                    disabled={disabled || isUploading}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                      isHDMode 
                        ? "bg-amber-500 text-white shadow-sm" 
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Sparkles className={cn("h-3 w-3", isHDMode && "animate-pulse")} />
                    HD {isHDMode ? "ON" : "OFF"}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <UploadStatusBar
        phase={uploadPhase}
        progress={uploadProgress}
        label={uploadLabel}
        errorMessage={uploadError}
      />

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
  onImageTap, // Optional callback when image is tapped (index) => void
  showHDToggle = true, // Show HD toggle by default
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isHDMode, setIsHDMode] = useState(false); // HD mode toggle state
  const [uploadPhase, setUploadPhase] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [resultSuccess, setResultSuccess] = useState(null);
  const [resultError, setResultError] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const multiTimerRef = useRef(null);

  const setUploadingState = state => {
    setIsUploading(state);
    onUploadingChange?.(state);
  };

  const clearMultiResultLater = useCallback(() => {
    if (multiTimerRef.current) clearTimeout(multiTimerRef.current);
    multiTimerRef.current = setTimeout(() => {
      setResultSuccess(null);
      setResultError(null);
      multiTimerRef.current = null;
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (multiTimerRef.current) clearTimeout(multiTimerRef.current);
    };
  }, []);

  const handleFilesSelect = async (e, fromCamera = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    const filesToUpload = files.slice(0, remainingSlots);
    const n = filesToUpload.length;
    if (n === 0) return;

    if (multiTimerRef.current) {
      clearTimeout(multiTimerRef.current);
      multiTimerRef.current = null;
    }
    setResultSuccess(null);
    setResultError(null);
    setUploadingState(true);
    setUploadPhase("compressing");
    setUploadLabel(n > 1 ? `Preparing ${n} images…` : "Preparing image…");
    setUploadProgress(null);

    const newKeys = [];
    const errors = [];

    for (let i = 0; i < n; i++) {
      const file = filesToUpload[i];
      try {
        if (n > 1) {
          setUploadPhase("compressing");
          setUploadLabel(`Preparing image ${i + 1} of ${n}…`);
        }

        let compressedFile;
        if (isHDMode) {
          compressedFile = await compressForHD(file);
          console.log(`[HD Upload] Original: ${Math.round(file.size/1024)}KB → Compressed: ${Math.round(compressedFile.size/1024)}KB`);
        } else {
          compressedFile = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.8,
            maxSizeKB: 500,
          });
        }

        setUploadPhase("uploading");
        setUploadLabel(n > 1 ? `Uploading image ${i + 1} of ${n}…` : "Uploading…");
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("folder", folder);

        const result = await uploadFormDataWithProgress(formData, pct => {
          if (pct === null) {
            setUploadProgress(null);
            return;
          }
          const overall = Math.round(((i + pct / 100) / n) * 100);
          setUploadProgress(overall);
        });

        newKeys.push(result.storageKey || result.url);
      } catch (error) {
        console.error("Upload failed:", error);
        errors.push(error?.message || "Could not upload a photo.");
      }
    }

    if (newKeys.length > 0) {
      onChange?.([...value, ...newKeys]);
    }

    setUploadingState(false);
    setUploadPhase("idle");
    setUploadProgress(null);
    setUploadLabel("");

    if (newKeys.length > 0 && errors.length === 0) {
      setResultSuccess(
        n > 1 ? `Successfully uploaded ${newKeys.length} images.` : "Image uploaded successfully."
      );
      setResultError(null);
      clearMultiResultLater();
    } else if (newKeys.length > 0 && errors.length > 0) {
      setResultSuccess(`Uploaded ${newKeys.length} of ${n} image(s).`);
      setResultError(
        errors.length === 1
          ? errors[0]
          : `${errors[0]} (${errors.length - 1} more failed)`
      );
      clearMultiResultLater();
    } else if (errors.length > 0) {
      setResultSuccess(null);
      setResultError(
        errors.length === 1
          ? errors[0]
          : `No images uploaded. ${errors[0]} (${errors.length - 1} more errors.)`
      );
      clearMultiResultLater();
    }
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
    // Call external callback if provided
    onImageTap?.(index);
    // Open internal viewer
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

        {/* HD Toggle and info */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {value.length} of {maxImages} images • Tap to view
          </p>
          {showHDToggle && (
            <button
              type="button"
              onClick={() => setIsHDMode(!isHDMode)}
              disabled={disabled || isUploading}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                isHDMode 
                  ? "bg-amber-500 text-white shadow-sm" 
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              <Sparkles className={cn("h-3 w-3", isHDMode && "animate-pulse")} />
              HD {isHDMode ? "ON" : "OFF"}
            </button>
          )}
        </div>
        {isHDMode && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400">
            HD mode: Images will be uploaded in high quality (larger file size)
          </p>
        )}

        <UploadStatusBar
          phase={uploadPhase === "idle" ? "idle" : uploadPhase}
          progress={uploadProgress}
          label={uploadLabel}
          errorMessage=""
        />

        {(resultSuccess || resultError) && uploadPhase === "idle" && !isUploading && (
          <div className="space-y-1.5" role="status" aria-live="polite">
            {resultSuccess && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {resultSuccess}
              </p>
            )}
            {resultError && (
              <p className="text-xs font-medium leading-snug text-destructive">{resultError}</p>
            )}
          </div>
        )}
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
  const [useFallback, setUseFallback] = useState(false);

  const primarySrc = isBase64
    ? storageKey
    : urls.thumbnail || urls.src || urls.original || storageKey;

  const fallbackSrc = isBase64 ? null : urls.original || resolveImageUrl(storageKey);

  const imageSrc = useFallback && fallbackSrc ? fallbackSrc : primarySrc;

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
      <img
        src={imageSrc}
        alt={`Image ${index + 1}`}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
          !isLoaded && !isBase64 ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!useFallback && fallbackSrc && fallbackSrc !== primarySrc) {
            setUseFallback(true);
          } else {
            setHasError(true);
          }
        }}
        loading="eager"
      />
    </>
  );
}

export default ImageUpload;
