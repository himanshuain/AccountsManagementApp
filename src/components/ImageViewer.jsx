"use client";

import { useEffect, useRef, useState } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";
import { Share2, Download } from "lucide-react";
import { toast } from "sonner";

// Custom toolbar button for share
const shareButton = {
  name: "share",
  order: 9,
  isButton: true,
  html: `<svg class="pswp__icn" viewBox="0 0 24 24" width="24" height="24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 6 12 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="2" x2="12" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  onClick: async (event, el, pswp) => {
    const currentSlide = pswp.currSlide;
    const src = currentSlide?.data?.src;

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
  },
};

// Custom download button
const downloadButton = {
  name: "download",
  order: 8,
  isButton: true,
  html: `<svg class="pswp__icn" viewBox="0 0 24 24" width="24" height="24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="7 10 12 15 17 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="15" x2="12" y2="3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  onClick: async (event, el, pswp) => {
    const currentSlide = pswp.currSlide;
    const src = currentSlide?.data?.src;

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
  },
};

/**
 * Single Image Viewer using PhotoSwipe
 */
export function ImageViewer({ src, alt = "Image", open, onOpenChange }) {
  const lightboxRef = useRef(null);

  useEffect(() => {
    if (!open || !src) return;

    // Get image dimensions
    const img = new Image();
    img.onload = () => {
      const lightbox = new PhotoSwipeLightbox({
        dataSource: [
          {
            src: src,
            w: img.naturalWidth || 1920,
            h: img.naturalHeight || 1080,
            alt: alt,
          },
        ],
        showHideAnimationType: "fade",
        pswpModule: () => import("photoswipe"),
        paddingFn: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
        bgOpacity: 0.95,
        pinchToClose: true,
        closeOnVerticalDrag: true,
        // Enable zoom
        initialZoomLevel: "fit",
        secondaryZoomLevel: 2.5,
        maxZoomLevel: 5,
      });

      // Register custom buttons
      lightbox.on("uiRegister", () => {
        lightbox.pswp.ui.registerElement(shareButton);
        lightbox.pswp.ui.registerElement(downloadButton);
      });

      // Handle close
      lightbox.on("close", () => {
        onOpenChange(false);
      });

      lightbox.init();
      lightbox.loadAndOpen(0);
      lightboxRef.current = lightbox;
    };

    img.onerror = () => {
      // Fallback dimensions
      const lightbox = new PhotoSwipeLightbox({
        dataSource: [
          {
            src: src,
            w: 1920,
            h: 1080,
            alt: alt,
          },
        ],
        showHideAnimationType: "fade",
        pswpModule: () => import("photoswipe"),
        paddingFn: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
        bgOpacity: 0.95,
        pinchToClose: true,
        closeOnVerticalDrag: true,
        initialZoomLevel: "fit",
        secondaryZoomLevel: 2.5,
        maxZoomLevel: 5,
      });

      lightbox.on("uiRegister", () => {
        lightbox.pswp.ui.registerElement(shareButton);
        lightbox.pswp.ui.registerElement(downloadButton);
      });

      lightbox.on("close", () => {
        onOpenChange(false);
      });

      lightbox.init();
      lightbox.loadAndOpen(0);
      lightboxRef.current = lightbox;
    };

    img.src = src;

    return () => {
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
        lightboxRef.current = null;
      }
    };
  }, [open, src, alt, onOpenChange]);

  return null; // PhotoSwipe creates its own DOM elements
}

/**
 * Gallery Viewer for multiple images using PhotoSwipe
 */
export function ImageGalleryViewer({ images = [], initialIndex = 0, open, onOpenChange }) {
  const lightboxRef = useRef(null);
  const [loadedImages, setLoadedImages] = useState([]);

  useEffect(() => {
    if (!open || images.length === 0) return;

    // Load all image dimensions
    const loadImageDimensions = async () => {
      const imageData = await Promise.all(
        images.map(
          (src, index) =>
            new Promise(resolve => {
              const img = new Image();
              img.onload = () => {
                resolve({
                  src: src,
                  w: img.naturalWidth || 1920,
                  h: img.naturalHeight || 1080,
                  alt: `Image ${index + 1}`,
                });
              };
              img.onerror = () => {
                resolve({
                  src: src,
                  w: 1920,
                  h: 1080,
                  alt: `Image ${index + 1}`,
                });
              };
              img.src = src;
            })
        )
      );

      setLoadedImages(imageData);

      const lightbox = new PhotoSwipeLightbox({
        dataSource: imageData,
        showHideAnimationType: "fade",
        pswpModule: () => import("photoswipe"),
        paddingFn: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
        bgOpacity: 0.95,
        pinchToClose: true,
        closeOnVerticalDrag: true,
        // Enable zoom
        initialZoomLevel: "fit",
        secondaryZoomLevel: 2.5,
        maxZoomLevel: 5,
        // Counter
        counter: images.length > 1,
      });

      // Register custom buttons
      lightbox.on("uiRegister", () => {
        lightbox.pswp.ui.registerElement(shareButton);
        lightbox.pswp.ui.registerElement(downloadButton);
      });

      // Handle close
      lightbox.on("close", () => {
        onOpenChange(false);
      });

      lightbox.init();
      lightbox.loadAndOpen(initialIndex);
      lightboxRef.current = lightbox;
    };

    loadImageDimensions();

    return () => {
      if (lightboxRef.current) {
        lightboxRef.current.destroy();
        lightboxRef.current = null;
      }
    };
  }, [open, images, initialIndex, onOpenChange]);

  return null; // PhotoSwipe creates its own DOM elements
}

export default ImageViewer;
