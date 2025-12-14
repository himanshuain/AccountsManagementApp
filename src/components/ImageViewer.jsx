"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Share2, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Simple and reliable Image Viewer with touch gestures
 * - Pinch to zoom
 * - Double tap to zoom
 * - Pan when zoomed
 * - Swipe down to close
 */
export function ImageViewer({ src, alt = "Image", open, onOpenChange }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  // Touch gesture state
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

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsLoading(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Calculate distance between two touch points
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start
  const handleTouchStart = useCallback(
    e => {
      const touches = e.touches;

      if (touches.length === 2) {
        // Pinch start
        e.preventDefault();
        touchState.current.isPinching = true;
        touchState.current.startDistance = getDistance(touches[0], touches[1]);
        touchState.current.startScale = scale;
      } else if (touches.length === 1) {
        // Single touch - check for double tap
        const now = Date.now();
        const timeDiff = now - touchState.current.lastTap;

        if (timeDiff < 300 && timeDiff > 0) {
          // Double tap - toggle zoom
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
          touchState.current.startX = touches[0].clientX;
          touchState.current.startY = touches[0].clientY;
          touchState.current.startPosition = { ...position };
          touchState.current.isDragging = true;
        }
      }
    },
    [scale, position]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    e => {
      const touches = e.touches;

      if (touchState.current.isPinching && touches.length === 2) {
        // Pinch zoom
        e.preventDefault();
        const currentDistance = getDistance(touches[0], touches[1]);
        const scaleFactor = currentDistance / touchState.current.startDistance;
        const newScale = Math.min(Math.max(touchState.current.startScale * scaleFactor, 0.5), 5);
        setScale(newScale);
      } else if (touchState.current.isDragging && touches.length === 1) {
        const deltaX = touches[0].clientX - touchState.current.startX;
        const deltaY = touches[0].clientY - touchState.current.startY;

        if (scale > 1) {
          // Pan when zoomed
          e.preventDefault();
          setPosition({
            x: touchState.current.startPosition.x + deltaX,
            y: touchState.current.startPosition.y + deltaY,
          });
        } else {
          // Swipe down to close when not zoomed
          if (deltaY > 100 && Math.abs(deltaX) < 50) {
            onOpenChange(false);
          }
        }
      }
    },
    [scale, onOpenChange]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    touchState.current.isPinching = false;
    touchState.current.isDragging = false;

    // Snap back if scale is too small
    if (scale < 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback(e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  }, []);

  // Handle share
  const handleShare = async () => {
    if (!src) return;

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: blob.type });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Shared Image",
        });
        toast.success("Shared successfully");
      } else if (navigator.share) {
        await navigator.share({
          title: "Shared Image",
          url: src,
        });
        toast.success("Shared successfully");
      } else {
        await navigator.clipboard.writeText(src);
        toast.success("Link copied to clipboard");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Share failed:", error);
        toast.error("Failed to share");
      }
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!src) return;

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download image");
    }
  };

  // Handle zoom buttons
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  // Handle rotation
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Handle close
  const handleClose = () => {
    onOpenChange(false);
  };

  // Handle backdrop click
  const handleBackdropClick = e => {
    if (e.target === containerRef.current && scale === 1) {
      handleClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-10 w-10"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleZoomOut}
            disabled={scale <= 1}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="text-white text-sm min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleZoomIn}
            disabled={scale >= 5}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleRotate}
          >
            <RotateCw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleShare}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={handleBackdropClick}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={cn(
            "max-w-full max-h-full object-contain select-none transition-opacity duration-300",
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
          onError={() => setIsLoading(false)}
          draggable={false}
        />
      </div>

      {/* Hint text */}
      {scale === 1 && (
        <div className="absolute bottom-6 left-0 right-0 text-center text-white/50 text-sm pointer-events-none">
          Double tap to zoom • Swipe down to close
        </div>
      )}
    </div>
  );
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

  const containerRef = useRef(null);

  // Touch gesture state
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

  // Reset when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsLoading(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, initialIndex]);

  // Reset zoom when changing images
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setIsLoading(true);
  }, [currentIndex]);

  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
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
      } else if (touches.length === 1) {
        const now = Date.now();
        const timeDiff = now - touchState.current.lastTap;

        if (timeDiff < 300 && timeDiff > 0) {
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
          touchState.current.startX = touches[0].clientX;
          touchState.current.startY = touches[0].clientY;
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
            x: touchState.current.startPosition.x + deltaX,
            y: touchState.current.startPosition.y + deltaY,
          });
        } else {
          // Swipe to navigate or close
          if (deltaY > 100 && Math.abs(deltaX) < 50) {
            onOpenChange(false);
          } else if (Math.abs(deltaX) > 80 && Math.abs(deltaY) < 50) {
            if (deltaX > 0 && currentIndex > 0) {
              setCurrentIndex(prev => prev - 1);
              touchState.current.isDragging = false;
            } else if (deltaX < 0 && currentIndex < images.length - 1) {
              setCurrentIndex(prev => prev + 1);
              touchState.current.isDragging = false;
            }
          }
        }
      }
    },
    [scale, onOpenChange, currentIndex, images.length]
  );

  const handleTouchEnd = useCallback(() => {
    touchState.current.isPinching = false;
    touchState.current.isDragging = false;

    if (scale < 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  const handleWheel = useCallback(e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5));
  }, []);

  const handleShare = async () => {
    const src = images[currentIndex];
    if (!src) return;

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: blob.type });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Shared Image" });
        toast.success("Shared successfully");
      } else if (navigator.share) {
        await navigator.share({ title: "Shared Image", url: src });
        toast.success("Shared successfully");
      } else {
        await navigator.clipboard.writeText(src);
        toast.success("Link copied to clipboard");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        toast.error("Failed to share");
      }
    }
  };

  const handleDownload = async () => {
    const src = images[currentIndex];
    if (!src) return;

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (!open || images.length === 0) return null;

  const currentSrc = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-10 w-10"
          onClick={handleClose}
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-2">
          {images.length > 1 && (
            <span className="text-white text-sm">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={() => setRotation(prev => (prev + 90) % 360)}
          >
            <RotateCw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleShare}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={`Image ${currentIndex + 1}`}
          className={cn(
            "max-w-full max-h-full object-contain select-none transition-opacity duration-300",
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
          onError={() => setIsLoading(false)}
          draggable={false}
        />
      </div>

      {/* Navigation arrows for desktop */}
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              onClick={handlePrev}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          {currentIndex < images.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              onClick={handleNext}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </>
      )}

      {/* Hint text */}
      {scale === 1 && (
        <div className="absolute bottom-6 left-0 right-0 text-center text-white/50 text-sm pointer-events-none">
          Double tap to zoom • Swipe to navigate • Swipe down to close
        </div>
      )}

      {/* Thumbnail strip for multiple images */}
      {images.length > 1 && (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-2 px-4">
          {images.map((img, idx) => (
            <button
              key={idx}
              className={cn(
                "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                idx === currentIndex
                  ? "border-white scale-110"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
              onClick={() => setCurrentIndex(idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageViewer;
