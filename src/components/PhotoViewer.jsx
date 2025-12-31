"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { PhotoProvider, PhotoView, PhotoSlider } from "react-photo-view";
import { motion } from "motion/react";
import { 
  X, Download, Share2, AlertCircle, Maximize2 
} from "lucide-react";
import { toast } from "sonner";
import { resolveImageUrl, getImageUrls, isDataUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

import "react-photo-view/dist/react-photo-view.css";

/**
 * Floating toolbar overlay for the photo viewer
 * This renders as fixed position overlay for maximum visibility
 */
function FloatingToolbar({ 
  onDownload, 
  onShare, 
  onClose,
  index,
  total
}) {
  return (
    <>
      {/* Top bar with close and counter */}
      <div className="fixed top-0 left-0 right-0 z-[2147483647] flex items-center justify-between p-4 pt-safe bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 active:scale-95 transition-all"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Counter */}
        {total > 1 && (
          <span className="px-3 py-1.5 rounded-full bg-black/50 text-white font-mono text-sm">
            {index + 1} / {total}
          </span>
        )}

        {/* Spacer for balance */}
        <div className="w-12" />
      </div>

      {/* Bottom bar with actions */}
      <div className="fixed bottom-0 left-0 right-0 z-[2147483647] flex items-center justify-center gap-4 p-4 pb-safe bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
        <button
          onClick={onShare}
          className="flex flex-col items-center gap-1 p-3 rounded-xl bg-black/50 text-white hover:bg-black/70 active:scale-95 transition-all min-w-[70px]"
        >
          <Share2 className="h-6 w-6" />
          <span className="text-xs">Share</span>
        </button>
        <button
          onClick={onDownload}
          className="flex flex-col items-center gap-1 p-3 rounded-xl bg-black/50 text-white hover:bg-black/70 active:scale-95 transition-all min-w-[70px]"
        >
          <Download className="h-6 w-6" />
          <span className="text-xs">Download</span>
        </button>
      </div>

      {/* Swipe hint */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2147483647] pointer-events-none">
        <div className="flex flex-col items-center gap-1 text-white/50">
          <ChevronDown className="h-5 w-5 animate-bounce" />
          <span className="text-xs">Swipe down to close</span>
        </div>
      </div>
    </>
  );
}

// ChevronDown icon for swipe hint
function ChevronDown({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * Custom broken/loading elements
 */
function LoadingElement() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center h-full w-full"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="h-10 w-10 rounded-full border-4 border-white/30 border-t-white"
      />
    </motion.div>
  );
}

function BrokenElement({ onRetry }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-4 text-white/70"
    >
      <AlertCircle className="h-16 w-16" />
      <p className="text-lg">Failed to load image</p>
      {onRetry && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          Retry
        </motion.button>
      )}
    </motion.div>
  );
}

/**
 * PhotoViewerProvider - Wrap this around your app or page to enable PhotoView
 * Any PhotoViewTrigger inside will be part of the same gallery
 * Note: This uses the default toolbar from react-photo-view
 */
export function PhotoViewerProvider({ children, loop = true }) {
  return (
    <PhotoProvider
      speed={() => 300}
      easing={(type) => (type === 2 ? "cubic-bezier(0.36, 0, 0.66, -0.56)" : "cubic-bezier(0.4, 0, 0.2, 1)")}
      loop={loop}
      maskOpacity={0.98}
      pullClosable={true}
      maskClosable={true}
      loadingElement={<LoadingElement />}
      brokenElement={<BrokenElement />}
    >
      {children}
    </PhotoProvider>
  );
}

/**
 * PhotoViewTrigger - Click trigger that opens the photo in gallery
 */
export function PhotoViewTrigger({ src, alt, children, className }) {
  const imageUrl = useMemo(() => {
    if (!src) return "";
    if (isDataUrl(src)) return src;
    try {
      return resolveImageUrl(src);
    } catch {
      return src;
    }
  }, [src]);

  if (!src) return null;

  return (
    <PhotoView src={imageUrl}>
      {children || (
        <img 
          src={imageUrl} 
          alt={alt || "Image"} 
          className={cn("cursor-pointer", className)}
          loading="lazy"
        />
      )}
    </PhotoView>
  );
}

/**
 * Standalone Photo Viewer - Controlled modal for single image
 * Uses portal to render at document body level to avoid z-index/touch conflicts
 */
export function PhotoViewer({ src, alt = "Image", open, onOpenChange }) {
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const imageUrl = useMemo(() => {
    if (!src) return "";
    if (isDataUrl(src)) return src;
    try {
      return resolveImageUrl(src);
    } catch {
      return src;
    }
  }, [src]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setScale(1);
      setRotate(0);
    }
  }, [open]);

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      // For data URLs, convert directly
      if (isDataUrl(imageUrl)) {
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = `image-${Date.now()}.jpg`;
        link.click();
        toast.success("Image downloaded");
        return;
      }
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
      // For data URLs, share as file if possible
      if (navigator.share) {
        if (isDataUrl(imageUrl)) {
          // Convert data URL to blob for sharing
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], `image-${Date.now()}.jpg`, { type: blob.type });
          await navigator.share({ files: [file], title: alt });
        } else {
          await navigator.share({ url: imageUrl, title: alt });
        }
      } else {
        await navigator.clipboard.writeText(imageUrl);
        toast.success("Link copied");
      }
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Failed to share");
    }
  };

  if (!open || !src || !mounted) return null;

  const viewer = (
    <>
      <PhotoSlider
        images={[{ src: imageUrl, key: imageUrl }]}
        visible={open}
        onClose={() => onOpenChange(false)}
        index={0}
        onIndexChange={() => {}}
        speed={() => 300}
        easing={(type) => (type === 2 ? "cubic-bezier(0.36, 0, 0.66, -0.56)" : "cubic-bezier(0.4, 0, 0.2, 1)")}
        maskOpacity={0.98}
        pullClosable={true}
        maskClosable={true}
        bannerVisible={false}
        loadingElement={<LoadingElement />}
        brokenElement={<BrokenElement />}
      />
      {/* Floating toolbar rendered separately for maximum visibility */}
      <FloatingToolbar
        index={0}
        total={1}
        onDownload={handleDownload}
        onShare={handleShare}
        onClose={() => onOpenChange(false)}
      />
    </>
  );

  // Render via portal to document body
  return createPortal(viewer, document.body);
}

/**
 * Photo Gallery Viewer - For multiple images with navigation
 * Uses portal to render at document body level to avoid z-index/touch conflicts
 */
export function PhotoGalleryViewer({ 
  images = [], 
  initialIndex = 0, 
  open, 
  onOpenChange 
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Normalize and resolve images
  const normalizedImages = useMemo(() => {
    return images.map((img, idx) => {
      const src = typeof img === "string" ? img : (img.url || img.src);
      const resolvedUrl = isDataUrl(src) ? src : resolveImageUrl(src);
      return {
        src: resolvedUrl,
        key: `${resolvedUrl}-${idx}`,
        // Keep additional metadata
        amount: img?.amount,
        date: img?.date,
        customerName: img?.customerName,
      };
    });
  }, [images]);

  // Reset index when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const handleDownload = useCallback(async () => {
    const url = normalizedImages[currentIndex]?.src;
    if (!url) return;
    try {
      // For data URLs, convert directly
      if (isDataUrl(url)) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `image-${Date.now()}.jpg`;
        link.click();
        toast.success("Image downloaded");
        return;
      }
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `image-${Date.now()}.jpg`;
      link.click();
      URL.revokeObjectURL(blobUrl);
      toast.success("Image downloaded");
    } catch {
      toast.error("Failed to download");
    }
  }, [normalizedImages, currentIndex]);

  const handleShare = useCallback(async () => {
    const url = normalizedImages[currentIndex]?.src;
    if (!url) return;
    try {
      if (navigator.share) {
        if (isDataUrl(url)) {
          // Convert data URL to blob for sharing
          const response = await fetch(url);
          const blob = await response.blob();
          const file = new File([blob], `image-${Date.now()}.jpg`, { type: blob.type });
          await navigator.share({ files: [file], title: "Shared Image" });
        } else {
          await navigator.share({ url, title: "Shared Image" });
        }
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Failed to share");
    }
  }, [normalizedImages, currentIndex]);

  if (!open || normalizedImages.length === 0 || !mounted) return null;

  const currentImage = normalizedImages[currentIndex];

  const viewer = (
    <>
      <PhotoSlider
        images={normalizedImages}
        visible={open}
        onClose={() => onOpenChange(false)}
        index={currentIndex}
        onIndexChange={setCurrentIndex}
        speed={() => 300}
        easing={(type) => (type === 2 ? "cubic-bezier(0.36, 0, 0.66, -0.56)" : "cubic-bezier(0.4, 0, 0.2, 1)")}
        loop={normalizedImages.length > 1}
        maskOpacity={0.98}
        pullClosable={true}
        maskClosable={true}
        bannerVisible={false}
        loadingElement={<LoadingElement />}
        brokenElement={<BrokenElement />}
        overlayRender={({ index }) => {
          const img = normalizedImages[index];
          // Show transaction info overlay if available
          if (img?.amount !== undefined) {
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2 }}
                className="absolute bottom-28 left-4 right-4 rounded-xl bg-black/70 backdrop-blur-sm p-4 text-white"
              >
                <p className="text-2xl font-bold font-mono">
                  ₹{Number(img.amount).toLocaleString("en-IN")}
                </p>
                {img.customerName && (
                  <p className="text-sm text-white/80">{img.customerName}</p>
                )}
                {img.date && (
                  <p className="text-xs text-white/60">
                    {new Date(img.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </motion.div>
            );
          }
          return null;
        }}
      />
      {/* Floating toolbar rendered separately for maximum visibility */}
      <FloatingToolbar
        index={currentIndex}
        total={normalizedImages.length}
        onDownload={handleDownload}
        onShare={handleShare}
        onClose={() => onOpenChange(false)}
      />
    </>
  );

  // Render via portal to document body
  return createPortal(viewer, document.body);
}

/**
 * Image Thumbnail with zoom preview trigger
 */
export function ImageThumbnail({ 
  src, 
  alt, 
  className, 
  onClick,
  showExpandIcon = true,
  aspectRatio = "square" // square, video, portrait
}) {
  const imageUrl = useMemo(() => {
    if (!src) return "";
    if (isDataUrl(src)) return src;
    try {
      const urls = getImageUrls(src);
      return urls.thumbnail || urls.src;
    } catch {
      return src;
    }
  }, [src]);

  const fullUrl = useMemo(() => {
    if (!src) return "";
    if (isDataUrl(src)) return src;
    return resolveImageUrl(src);
  }, [src]);

  const aspectClasses = {
    square: "aspect-square",
    video: "aspect-video",
    portrait: "aspect-[3/4]",
  };

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted cursor-pointer group",
        aspectClasses[aspectRatio],
        className
      )}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt || "Image"}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        onError={(e) => {
          e.target.style.opacity = "0";
        }}
      />
      {showExpandIcon && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1, opacity: 1 }}
            className="p-2 rounded-full bg-white/20 backdrop-blur-sm"
          >
            <Maximize2 className="h-5 w-5 text-white" />
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Named exports for backward compatibility
export { PhotoViewer as ImageViewer };
export { PhotoGalleryViewer as ImageGalleryViewer };

export default PhotoViewer;

