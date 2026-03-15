"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue } from "motion/react";
import { cn } from "@/lib/utils";

const ONE_SECOND = 1000;
const AUTO_DELAY = ONE_SECOND * 10;
const DRAG_BUFFER = 50;

const SPRING_OPTIONS = {
  type: "spring",
  mass: 3,
  stiffness: 400,
  damping: 50,
};

/**
 * Swipeable image carousel for single or multiple images.
 *
 * @param {Object} props
 * @param {Array<string|{src: string, alt?: string}>} props.images - Image URLs or objects
 * @param {boolean} [props.autoPlay=true] - Auto-advance slides (disabled for single image)
 * @param {number} [props.autoPlayDelay] - Delay between slides in ms (default 10s)
 * @param {boolean} [props.showDots=true] - Show navigation dots
 * @param {boolean} [props.showGradientEdges=true] - Show gradient overlays on edges
 * @param {string} [props.className] - Container className
 * @param {string} [props.aspectRatio] - Aspect ratio class (default "aspect-video")
 * @param {function} [props.onImageClick] - Called with (image, index) when an image is tapped
 * @param {function} [props.onSlideChange] - Called with (index) when the active slide changes
 * @param {number} [props.activeIndex] - Externally-controlled slide index (jump to this slide)
 */
export function SwipeCarousel({
  images = [],
  autoPlay = true,
  autoPlayDelay = AUTO_DELAY,
  showDots = true,
  showGradientEdges = true,
  className,
  aspectRatio = "aspect-video",
  onImageClick,
  onSlideChange,
  activeIndex,
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const dragX = useMotionValue(0);

  useEffect(() => {
    if (activeIndex !== undefined && activeIndex >= 0 && activeIndex !== imgIndex) {
      setImgIndex(activeIndex);
    }
    // only react to external prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const normalizedImages = images.map((img) =>
    typeof img === "string" ? { src: img } : img
  );

  const count = normalizedImages.length;
  const isSingle = count <= 1;

  useEffect(() => {
    if (isSingle || !autoPlay) return;

    const intervalRef = setInterval(() => {
      if (dragX.get() === 0) {
        setImgIndex((pv) => (pv === count - 1 ? 0 : pv + 1));
      }
    }, autoPlayDelay);

    return () => clearInterval(intervalRef);
  }, [isSingle, autoPlay, autoPlayDelay, count, dragX]);

  useEffect(() => {
    if (imgIndex >= count && count > 0) {
      setImgIndex(0);
    }
  }, [images.length, count, imgIndex]);

  useEffect(() => {
    onSlideChange?.(imgIndex);
  }, [imgIndex, onSlideChange]);

  const onDragEnd = () => {
    const x = dragX.get();
    if (x <= -DRAG_BUFFER && imgIndex < count - 1) {
      setImgIndex((pv) => pv + 1);
    } else if (x >= DRAG_BUFFER && imgIndex > 0) {
      setImgIndex((pv) => pv - 1);
    }
  };

  if (count === 0) return null;

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <motion.div
        drag={isSingle ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x: dragX }}
        animate={{ translateX: `-${imgIndex * 100}%` }}
        transition={SPRING_OPTIONS}
        onDragEnd={onDragEnd}
        className={cn(
          "flex items-center",
          !isSingle && "cursor-grab active:cursor-grabbing"
        )}
      >
        {normalizedImages.map((img, idx) => (
          <motion.div
            key={img.src + idx}
            animate={{ scale: isSingle ? 1 : imgIndex === idx ? 0.95 : 0.85 }}
            transition={SPRING_OPTIONS}
            className={cn(
              "w-full shrink-0 overflow-hidden rounded-xl bg-muted",
              aspectRatio
            )}
            onClick={() => onImageClick?.(img, idx)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt={img.alt || `Image ${idx + 1}`}
              className="h-full w-full object-cover"
              loading={idx === 0 ? "eager" : "lazy"}
              draggable={false}
            />
          </motion.div>
        ))}
      </motion.div>

      {showDots && !isSingle && (
        <div className="mt-3 flex w-full justify-center gap-2">
          {normalizedImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setImgIndex(idx)}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors",
                idx === imgIndex
                  ? "bg-foreground"
                  : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}

      {showGradientEdges && !isSingle && (
        <>
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-[10vw] max-w-[100px] bg-gradient-to-r from-background/50 to-transparent" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-[10vw] max-w-[100px] bg-gradient-to-l from-background/50 to-transparent" />
        </>
      )}
    </div>
  );
}

export default SwipeCarousel;
