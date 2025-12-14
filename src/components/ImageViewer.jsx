"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Share2, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Simple and reliable Image Viewer with touch gestures
 * - Pinch to zoom from focal point
 * - Double tap to zoom at tap location
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
    lastTapX: 0,
    lastTapY: 0,
    startPosition: { x: 0, y: 0 },
    pinchCenterX: 0,
    pinchCenterY: 0,
  });

  // State for portal mounting
  const [mounted, setMounted] = useState(false);
  const portalContainerRef = useRef(null);

  // Create dedicated portal container on client side
  useEffect(() => {
    // Create a dedicated container for the image viewer portal
    const container = document.createElement("div");
    container.id = "image-viewer-portal-root";
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483647;
      pointer-events: none;
      isolation: isolate;
    `;
    document.body.appendChild(container);
    portalContainerRef.current = container;
    setMounted(true);

    return () => {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, []);

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsLoading(true);

      // Fallback for cached images where onLoad might not fire
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [open]);

  // Calculate distance between two touch points
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Get center point between two touches
  const getCenter = (touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
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
        touchState.current.startPosition = { ...position };

        // Store pinch center relative to container
        const center = getCenter(touches[0], touches[1]);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          touchState.current.pinchCenterX = center.x - rect.left - rect.width / 2;
          touchState.current.pinchCenterY = center.y - rect.top - rect.height / 2;
        }
      } else if (touches.length === 1) {
        // Single touch - check for double tap
        const now = Date.now();
        const timeDiff = now - touchState.current.lastTap;
        const touch = touches[0];

        if (timeDiff < 300 && timeDiff > 0) {
          // Double tap - zoom at tap location
          e.preventDefault();

          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const tapX = touch.clientX - rect.left - rect.width / 2;
            const tapY = touch.clientY - rect.top - rect.height / 2;

            if (scale > 1) {
              // Zoom out to 1x
              setScale(1);
              setPosition({ x: 0, y: 0 });
            } else {
              // Zoom in at tap location
              const newScale = 2.5;
              const scaleDiff = newScale - scale;
              setScale(newScale);
              setPosition({
                x: position.x - (tapX * scaleDiff) / newScale,
                y: position.y - (tapY * scaleDiff) / newScale,
              });
            }
          }
          touchState.current.lastTap = 0;
        } else {
          touchState.current.lastTap = now;
          touchState.current.lastTapX = touch.clientX;
          touchState.current.lastTapY = touch.clientY;
          touchState.current.startX = touch.clientX;
          touchState.current.startY = touch.clientY;
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
        // Pinch zoom from focal point
        e.preventDefault();
        const currentDistance = getDistance(touches[0], touches[1]);
        const scaleFactor = currentDistance / touchState.current.startDistance;
        const newScale = Math.min(Math.max(touchState.current.startScale * scaleFactor, 0.5), 5);

        // Calculate new position to zoom from pinch center
        const scaleDiff = newScale - touchState.current.startScale;
        const focalX = touchState.current.pinchCenterX;
        const focalY = touchState.current.pinchCenterY;

        const newX = touchState.current.startPosition.x - (focalX * scaleDiff) / newScale;
        const newY = touchState.current.startPosition.y - (focalY * scaleDiff) / newScale;

        setScale(newScale);
        setPosition({ x: newX, y: newY });
      } else if (touchState.current.isDragging && touches.length === 1) {
        const deltaX = touches[0].clientX - touchState.current.startX;
        const deltaY = touches[0].clientY - touchState.current.startY;

        if (scale > 1) {
          // Pan when zoomed
          e.preventDefault();
          setPosition({
            x: touchState.current.startPosition.x + deltaX / scale,
            y: touchState.current.startPosition.y + deltaY / scale,
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

  // Handle mouse wheel zoom at cursor position
  const handleWheel = useCallback(
    e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      const newScale = Math.min(Math.max(scale + delta, 0.5), 5);

      // Get cursor position relative to container center
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;

        // Adjust position to zoom at cursor
        const scaleDiff = newScale - scale;
        const newX = position.x - (cursorX * scaleDiff) / newScale;
        const newY = position.y - (cursorY * scaleDiff) / newScale;

        setScale(newScale);
        setPosition({ x: newX, y: newY });
      } else {
        setScale(newScale);
      }
    },
    [scale, position]
  );

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

  if (!open || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 bg-black/95 flex flex-col"
      style={{ zIndex: 2147483647, pointerEvents: "auto" }}
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0"
        style={{ zIndex: 2147483647, pointerEvents: "auto" }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-10 w-10"
          onClick={handleClose}
          style={{ pointerEvents: "auto" }}
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
            style={{ pointerEvents: "auto" }}
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
            style={{ pointerEvents: "auto" }}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleRotate}
            style={{ pointerEvents: "auto" }}
          >
            <RotateCw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleDownload}
            style={{ pointerEvents: "auto" }}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleShare}
            style={{ pointerEvents: "auto" }}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{ touchAction: "none", pointerEvents: "auto" }}
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

  if (!portalContainerRef.current) return null;
  return createPortal(content, portalContainerRef.current);
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
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef(null);
  const portalContainerRef = useRef(null);

  // Reset currentIndex when opening with a new initialIndex
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsLoading(true);

      // For cached images, onLoad might not fire, so check after a short delay
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [open, initialIndex]);

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
    pinchCenterX: 0,
    pinchCenterY: 0,
  });

  // Create dedicated portal container on client side
  useEffect(() => {
    const container = document.createElement("div");
    container.id = "image-gallery-viewer-portal-root";
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483647;
      pointer-events: none;
      isolation: isolate;
    `;
    document.body.appendChild(container);
    portalContainerRef.current = container;
    setMounted(true);

    return () => {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, []);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsLoading(true);
    }
  }, [open, initialIndex]);

  // Reset zoom when changing images
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setIsLoading(true);

    // Fallback for cached images where onLoad might not fire
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
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

        const center = getCenter(touches[0], touches[1]);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          touchState.current.pinchCenterX = center.x - rect.left - rect.width / 2;
          touchState.current.pinchCenterY = center.y - rect.top - rect.height / 2;
        }
      } else if (touches.length === 1) {
        const now = Date.now();
        const timeDiff = now - touchState.current.lastTap;
        const touch = touches[0];

        if (timeDiff < 300 && timeDiff > 0) {
          e.preventDefault();
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const tapX = touch.clientX - rect.left - rect.width / 2;
            const tapY = touch.clientY - rect.top - rect.height / 2;

            if (scale > 1) {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            } else {
              const newScale = 2.5;
              const scaleDiff = newScale - scale;
              setScale(newScale);
              setPosition({
                x: position.x - (tapX * scaleDiff) / newScale,
                y: position.y - (tapY * scaleDiff) / newScale,
              });
            }
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

        const scaleDiff = newScale - touchState.current.startScale;
        const focalX = touchState.current.pinchCenterX;
        const focalY = touchState.current.pinchCenterY;

        const newX = touchState.current.startPosition.x - (focalX * scaleDiff) / newScale;
        const newY = touchState.current.startPosition.y - (focalY * scaleDiff) / newScale;

        setScale(newScale);
        setPosition({ x: newX, y: newY });
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

  const handleWheel = useCallback(
    e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      const newScale = Math.min(Math.max(scale + delta, 0.5), 5);

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;

        const scaleDiff = newScale - scale;
        const newX = position.x - (cursorX * scaleDiff) / newScale;
        const newY = position.y - (cursorY * scaleDiff) / newScale;

        setScale(newScale);
        setPosition({ x: newX, y: newY });
      } else {
        setScale(newScale);
      }
    },
    [scale, position]
  );

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

  if (!open || images.length === 0 || !mounted) return null;

  const currentSrc = images[currentIndex];

  const content = (
    <div
      className="fixed inset-0 bg-black/95 flex flex-col"
      style={{ zIndex: 2147483647, pointerEvents: "auto" }}
      role="dialog"
      aria-modal="true"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0"
        style={{ zIndex: 2147483647, pointerEvents: "auto" }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-10 w-10"
          onClick={handleClose}
          style={{ pointerEvents: "auto" }}
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
            style={{ pointerEvents: "auto" }}
          >
            <RotateCw className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleDownload}
            style={{ pointerEvents: "auto" }}
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-10 w-10"
            onClick={handleShare}
            style={{ pointerEvents: "auto" }}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{ touchAction: "none", pointerEvents: "auto" }}
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
              style={{ zIndex: 2147483647, pointerEvents: "auto" }}
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
              style={{ zIndex: 2147483647, pointerEvents: "auto" }}
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
        <div
          className="absolute bottom-16 left-0 right-0 flex justify-center gap-2 px-4"
          style={{ zIndex: 2147483647, pointerEvents: "auto" }}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              className={cn(
                "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                idx === currentIndex
                  ? "border-white scale-110"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
              style={{ pointerEvents: "auto" }}
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

  if (!portalContainerRef.current) return null;
  return createPortal(content, portalContainerRef.current);
}

export default ImageViewer;
