"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getImageUrls, isCdnConfigured, isDataUrl } from "@/lib/image-url";

/**
 * Optimized image component with:
 * - LQIP (Low Quality Image Placeholder) for slow connections
 * - Lazy loading with IntersectionObserver
 * - Progressive loading
 * - Thumbnail generation
 *
 * Accepts both storage keys (new format) and full URLs (legacy)
 */
export function OptimizedImage({
  src,
  alt = "",
  className,
  containerClassName,
  width,
  height,
  quality = 80,
  priority = false,
  fill = false,
  onLoad,
  onClick,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState("");
  const [lqipSrc, setLqipSrc] = useState("");
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Get optimized URLs from storage key or URL
  useEffect(() => {
    if (!src) return;

    // Get optimized URLs (handles both storage keys and legacy URLs)
    if (!isDataUrl(src)) {
      const urls = getImageUrls(src, { width, height, quality });
      setLqipSrc(urls.lqip);
      setCurrentSrc(urls.src);
    } else {
      // Data URL - use as-is
      setLqipSrc(src);
      setCurrentSrc(src);
    }
  }, [src, width, height, quality]);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (priority || !containerRef.current) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "50px 0px", // Load images 50px before they come into view
        threshold: 0.01,
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  if (!src) return null;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", containerClassName)}
      style={fill ? { position: "relative" } : { width, height }}
    >
      {/* LQIP Background - shows while main image loads */}
      {lqipSrc && !isLoaded && (
        <img
          src={lqipSrc}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 h-full w-full scale-110 object-cover blur-lg transition-opacity duration-300",
            isLoaded ? "opacity-0" : "opacity-100"
          )}
          style={fill ? { objectFit: "cover" } : undefined}
        />
      )}

      {/* Main Image */}
      {isInView && currentSrc && (
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          style={
            fill
              ? {
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }
              : { width, height }
          }
          onLoad={handleLoad}
          onClick={onClick}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...props}
        />
      )}

      {/* Loading skeleton when not in view */}
      {!isInView && <div className={cn("absolute inset-0 animate-pulse bg-muted", className)} />}
    </div>
  );
}

/**
 * Thumbnail version of OptimizedImage
 * Uses lower quality and smaller dimensions automatically
 *
 * Accepts both storage keys and full URLs
 */
export function ThumbnailImage({ src, alt = "", className, size = 150, ...props }) {
  const [thumbSrc, setThumbSrc] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;

    if (!isDataUrl(src)) {
      const urls = getImageUrls(src, {
        width: size,
        height: size,
        quality: 50,
      });
      setThumbSrc(urls.thumbnail || urls.src);
    } else {
      setThumbSrc(src);
    }
  }, [src, size]);

  if (!src) return null;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      {/* Skeleton */}
      {!isLoaded && <div className="absolute inset-0 animate-pulse bg-muted" />}

      {/* Thumbnail */}
      {thumbSrc && (
        <img
          src={thumbSrc}
          alt={alt}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-200",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}

export default OptimizedImage;
