"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Share2,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/image-url";
import { getImageSizeBytes, formatBytes } from "@/lib/image-size";

/**
 * Simplified Image Viewer with reliable touch gestures
 * - Double tap to zoom
 * - Pinch to zoom
 * - Pan when zoomed
 * - Swipe down to close
 * - Properly handles R2 storage URLs
 */
export function ImageViewer({ src, alt = "Image", open, onOpenChange }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sizeLabel, setSizeLabel] = useState("");

  const containerRef = useRef(null);

  // Resolve the image URL - handles R2 storage keys and legacy URLs
  const imageUrl = useMemo(() => {
    if (!src) return "";
    try {
      return resolveImageUrl(src);
    } catch (e) {
      console.error("Failed to resolve image URL:", e);
      return src; // Fallback to original
    }
  }, [src]);

  // Touch state
  const touchState = useRef({
    startX: 0,
    startY: 0,
    startScale: 1,
    startDistance: 0,
    isPinching: false,
    isDragging: false,
    lastTap: 0,
    startPosition: { x: 0, y: 0 },
  });

  // Mount portal on client
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsLoading(true);
      setHasError(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    let isActive = true;
    setSizeLabel("");
    if (!open || !imageUrl) return;

    getImageSizeBytes(imageUrl, { allowDownload: true }).then(bytes => {
      if (!isActive) return;
      const label = bytes ? formatBytes(bytes) : "";
      setSizeLabel(label);
    });

    return () => {
      isActive = false;
    };
  }, [imageUrl, open]);

  // Get distance between two touch points
  const getDistance = (t1, t2) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Touch handlers
  const handleTouchStart = useCallback(
    e => {
      const touches = e.touches;

      if (touches.length === 2) {
        e.preventDefault();
        touchState.current.isPinching = true;
        touchState.current.startDistance = getDistance(touches[0], touches[1]);
        touchState.current.startScale = scale;
        touchState.current.startPosition = { ...position };
      } else if (touches.length === 1) {
        const now = Date.now();
        const touch = touches[0];

        // Double tap detection
        if (now - touchState.current.lastTap < 300) {
          e.preventDefault();
          if (scale > 1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          } else {
            setScale(2.5);
          }
          touchState.current.lastTap = 0;
        } else {
          touchState.current.lastTap = now;
          touchState.current.startX = touch.clientX;
          touchState.current.startY = touch.clientY;
          touchState.current.startPosition = { ...position };
          touchState.current.isDragging = true;
        }
      }
    },
    [scale, position]
  );

  const handleTouchMove = useCallback(
    e => {
      const touches = e.touches;

      if (touchState.current.isPinching && touches.length === 2) {
        e.preventDefault();
        const currentDistance = getDistance(touches[0], touches[1]);
        const scaleFactor = currentDistance / touchState.current.startDistance;
        const newScale = Math.min(Math.max(touchState.current.startScale * scaleFactor, 0.5), 5);
        setScale(newScale);
      } else if (touchState.current.isDragging && touches.length === 1) {
        const deltaX = touches[0].clientX - touchState.current.startX;
        const deltaY = touches[0].clientY - touchState.current.startY;

        if (scale > 1) {
          e.preventDefault();
          setPosition({
            x: touchState.current.startPosition.x + deltaX / scale,
            y: touchState.current.startPosition.y + deltaY / scale,
          });
        } else if (deltaY > 100 && Math.abs(deltaX) < 50) {
          // Swipe down to close
          onOpenChange(false);
        }
      }
    },
    [scale, onOpenChange]
  );

  const handleTouchEnd = useCallback(() => {
    touchState.current.isPinching = false;
    touchState.current.isDragging = false;
    if (scale < 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      const newScale = Math.min(Math.max(scale + delta, 1), 5);
      setScale(newScale);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
    },
    [scale]
  );

  // Actions
  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `image-${Date.now()}.jpg`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch {
      toast.error("Failed to download");
    }
  };

  const handleShare = async () => {
    if (!imageUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ url: imageUrl, title: "Shared Image" });
      } else {
        await navigator.clipboard.writeText(imageUrl);
        toast.success("Link copied");
      }
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Failed to share");
    }
  };

  const handleClose = () => onOpenChange(false);

  if (!open || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-black" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-white hover:bg-white/20"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {sizeLabel && (
          <span className="rounded-full bg-black/50 px-3 py-1.5 font-mono text-xs text-white">
            {sizeLabel}
          </span>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={() => setScale(s => Math.max(s - 0.5, 1))}
            disabled={scale <= 1}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="min-w-[50px] text-center font-mono text-sm text-white">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={() => setScale(s => Math.min(s + 0.5, 5))}
            disabled={scale >= 5}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={() => setRotation(r => (r + 90) % 360)}
          >
            <RotateCw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={handleShare}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden"
        style={{ touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={e => e.target === containerRef.current && scale === 1 && handleClose()}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          </div>
        )}

        {hasError ? (
          <div className="flex flex-col items-center gap-4 text-white/70">
            <AlertCircle className="h-16 w-16" />
            <p>Failed to load image</p>
            <Button
              variant="outline"
              onClick={() => {
                setHasError(false);
                setIsLoading(true);
              }}
            >
              Retry
            </Button>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={alt}
            className={cn(
              "max-h-full max-w-full select-none object-contain transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition:
                touchState.current.isPinching || touchState.current.isDragging
                  ? "none"
                  : "transform 0.2s ease-out",
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            draggable={false}
          />
        )}
      </div>

      {/* Hint */}
      {scale === 1 && !hasError && (
        <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/50">
          Double tap to zoom • Swipe down to close
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

/**
 * Gallery Viewer for multiple images
 */
export function ImageGalleryViewer({ images = [], initialIndex = 0, open, onOpenChange }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sizeLabel, setSizeLabel] = useState("");

  const containerRef = useRef(null);

  // Normalize images to array of objects
  const normalizedImages = useMemo(() => {
    return images.map(img => {
      if (typeof img === "string") return { url: img };
      return img;
    });
  }, [images]);

  const currentImage = normalizedImages[currentIndex] || {};

  // Resolve URL with fallback
  const imageUrl = useMemo(() => {
    const src = currentImage.url;
    if (!src) return "";
    try {
      return resolveImageUrl(src);
    } catch {
      return src;
    }
  }, [currentImage.url]);

  useEffect(() => {
    let isActive = true;
    setSizeLabel("");
    if (!open || !imageUrl) return;

    getImageSizeBytes(imageUrl, { allowDownload: true }).then(bytes => {
      if (!isActive) return;
      const label = bytes ? formatBytes(bytes) : "";
      setSizeLabel(label);
    });

    return () => {
      isActive = false;
    };
  }, [imageUrl, open]);

  // Touch state
  const touchState = useRef({
    startX: 0,
    startY: 0,
    startScale: 1,
    startDistance: 0,
    isPinching: false,
    isDragging: false,
    lastTap: 0,
    startPosition: { x: 0, y: 0 },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsLoading(true);
      setHasError(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, initialIndex]);

  // Reset when changing images
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setIsLoading(true);
    setHasError(false);
  }, [currentIndex]);

  // Preload adjacent images for smooth navigation
  useEffect(() => {
    if (!open || normalizedImages.length === 0) return;

    const preloadImage = index => {
      if (index >= 0 && index < normalizedImages.length) {
        const img = normalizedImages[index];
        const src = img?.url;
        if (src) {
          const preloadImg = new Image();
          try {
            preloadImg.src = resolveImageUrl(src);
          } catch {
            preloadImg.src = src;
          }
        }
      }
    };

    // Preload current, next, and previous images
    preloadImage(currentIndex);
    preloadImage(currentIndex + 1);
    preloadImage(currentIndex - 1);
  }, [open, currentIndex, normalizedImages]);

  const getDistance = (t1, t2) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    e => {
      const touches = e.touches;

      if (touches.length === 2) {
        e.preventDefault();
        touchState.current.isPinching = true;
        touchState.current.startDistance = getDistance(touches[0], touches[1]);
        touchState.current.startScale = scale;
        touchState.current.startPosition = { ...position };
      } else if (touches.length === 1) {
        const now = Date.now();
        const touch = touches[0];

        if (now - touchState.current.lastTap < 300) {
          e.preventDefault();
          if (scale > 1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          } else {
            setScale(2.5);
          }
          touchState.current.lastTap = 0;
        } else {
          touchState.current.lastTap = now;
          touchState.current.startX = touch.clientX;
          touchState.current.startY = touch.clientY;
          touchState.current.startPosition = { ...position };
          touchState.current.isDragging = true;
        }
      }
    },
    [scale, position]
  );

  const handleTouchMove = useCallback(
    e => {
      const touches = e.touches;

      if (touchState.current.isPinching && touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(touches[0], touches[1]);
        const factor = dist / touchState.current.startDistance;
        setScale(Math.min(Math.max(touchState.current.startScale * factor, 0.5), 5));
      } else if (touchState.current.isDragging && touches.length === 1) {
        const deltaX = touches[0].clientX - touchState.current.startX;
        const deltaY = touches[0].clientY - touchState.current.startY;

        if (scale > 1) {
          e.preventDefault();
          setPosition({
            x: touchState.current.startPosition.x + deltaX / scale,
            y: touchState.current.startPosition.y + deltaY / scale,
          });
        } else {
          // Swipe gestures when not zoomed
          if (deltaY > 100 && Math.abs(deltaX) < 50) {
            onOpenChange(false);
          } else if (Math.abs(deltaX) > 80 && Math.abs(deltaY) < 50) {
            if (deltaX > 0 && currentIndex > 0) {
              setCurrentIndex(i => i - 1);
              touchState.current.isDragging = false;
            } else if (deltaX < 0 && currentIndex < normalizedImages.length - 1) {
              setCurrentIndex(i => i + 1);
              touchState.current.isDragging = false;
            }
          }
        }
      }
    },
    [scale, onOpenChange, currentIndex, normalizedImages.length]
  );

  const handleTouchEnd = useCallback(() => {
    touchState.current.isPinching = false;
    touchState.current.isDragging = false;
    if (scale < 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  const handleWheel = useCallback(
    e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      const newScale = Math.min(Math.max(scale + delta, 1), 5);
      setScale(newScale);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
    },
    [scale]
  );

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `image-${Date.now()}.jpg`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded");
    } catch {
      toast.error("Failed to download");
    }
  };

  const handleShare = async () => {
    if (!imageUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ url: imageUrl });
      } else {
        await navigator.clipboard.writeText(imageUrl);
        toast.success("Link copied");
      }
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Failed to share");
    }
  };

  const handleClose = () => onOpenChange(false);
  const handlePrev = () => currentIndex > 0 && setCurrentIndex(i => i - 1);
  const handleNext = () =>
    currentIndex < normalizedImages.length - 1 && setCurrentIndex(i => i + 1);

  if (!open || !mounted || normalizedImages.length === 0) return null;

  const content = (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-black" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-white hover:bg-white/20"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {sizeLabel && (
          <span className="rounded-full bg-black/50 px-3 py-1.5 font-mono text-xs text-white">
            {sizeLabel}
          </span>
        )}

        {normalizedImages.length > 1 && (
          <span className="font-mono text-sm text-white">
            {currentIndex + 1} / {normalizedImages.length}
          </span>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={() => setRotation(r => (r + 90) % 360)}
          >
            <RotateCw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20"
            onClick={handleShare}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden"
        style={{ touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          </div>
        )}

        {hasError ? (
          <div className="flex flex-col items-center gap-4 text-white/70">
            <AlertCircle className="h-16 w-16" />
            <p>Failed to load image</p>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageUrl}
            alt={`Image ${currentIndex + 1}`}
            className={cn(
              "max-h-full max-w-full select-none object-contain transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition:
                touchState.current.isPinching || touchState.current.isDragging
                  ? "none"
                  : "transform 0.2s ease-out",
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            draggable={false}
          />
        )}
      </div>

      {/* Navigation Arrows */}
      {normalizedImages.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {currentIndex < normalizedImages.length - 1 && (
            <button
              className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              onClick={handleNext}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </>
      )}

      {/* Transaction Info */}
      {currentImage.amount !== undefined && (
        <div className="absolute bottom-20 left-4 right-4 rounded-xl bg-black/70 p-4 text-white backdrop-blur-sm">
          <p className="font-mono text-2xl font-bold">
            ₹{Number(currentImage.amount).toLocaleString("en-IN")}
          </p>
          {currentImage.customerName && (
            <p className="text-sm text-white/80">{currentImage.customerName}</p>
          )}
          {currentImage.date && (
            <p className="text-xs text-white/60">
              {new Date(currentImage.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      )}

      {/* Thumbnails */}
      {normalizedImages.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 overflow-x-auto px-4">
          {normalizedImages.slice(0, 8).map((img, idx) => {
            const thumbUrl = resolveImageUrl(img.url || img);
            return (
              <button
                key={idx}
                className={cn(
                  "h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                  idx === currentIndex
                    ? "scale-110 border-white"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
                onClick={() => setCurrentIndex(idx)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbUrl} alt="" className="h-full w-full object-cover" loading="eager" />
              </button>
            );
          })}
          {normalizedImages.length > 8 && (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-black/50 text-xs text-white">
              +{normalizedImages.length - 8}
            </div>
          )}
        </div>
      )}

      {/* Hint */}
      {scale === 1 && !currentImage.amount && (
        <div className="absolute bottom-20 left-0 right-0 text-center text-sm text-white/50">
          Double tap to zoom • Swipe to navigate
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

export default ImageViewer;
