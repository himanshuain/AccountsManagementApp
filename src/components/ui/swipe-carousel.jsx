"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, useMotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { UnavailableImageText } from "@/components/UnavailableImageText";

const ONE_SECOND = 1000;
const AUTO_DELAY = ONE_SECOND * 10;
const DRAG_BUFFER = 50;

// Resize ImageKit URLs for carousel display to avoid mobile decode limits on very large originals.
function optimizeForCarousel(src) {
  if (!src || typeof src !== "string") return src;
  if (src.startsWith("data:")) return src;
  if (!src.includes("ik.imagekit.io")) return src;
  try {
    const url = new URL(src);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return src;
    const id = parts[0];
    const hasTransform = parts[1]?.startsWith("tr:");
    const filePath = hasTransform ? parts.slice(2).join("/") : parts.slice(1).join("/");
    url.pathname = `/${id}/tr:w-800,q-80,f-auto/${filePath}`;
    return url.toString();
  } catch {
    return src;
  }
}

const SPRING_OPTIONS = {
  type: "spring",
  mass: 3,
  stiffness: 400,
  damping: 50,
};

/**
 * Swipeable image carousel for single or multiple images.
 */
export function SwipeCarousel({
  images = [],
  autoPlay = true,
  autoPlayDelay = AUTO_DELAY,
  showDots = true,
  showGradientEdges = true,
  className,
  aspectRatio = "aspect-video",
  unavailableLabel = "Photo",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const normalizedImages = useMemo(
    () =>
      images.map(img => {
        const raw = typeof img === "string" ? { src: img } : img;
        return { ...raw, src: optimizeForCarousel(raw.src) };
      }),
    [images]
  );

  const [failedByIndex, setFailedByIndex] = useState({});

  useEffect(() => {
    setFailedByIndex({});
  }, [images]);

  const count = normalizedImages.length;
  const isSingle = count <= 1;
  const allFailed =
    count > 0 && normalizedImages.every((_, idx) => failedByIndex[idx]);

  useEffect(() => {
    if (isSingle || !autoPlay) return;

    const intervalRef = setInterval(() => {
      if (dragX.get() === 0) {
        setImgIndex(pv => (pv === count - 1 ? 0 : pv + 1));
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
      setImgIndex(pv => pv + 1);
    } else if (x >= DRAG_BUFFER && imgIndex > 0) {
      setImgIndex(pv => pv - 1);
    }
  };

  if (count === 0) return null;

  if (allFailed) {
    return (
      <UnavailableImageText
        label={unavailableLabel}
        allCount={count}
        className={className}
        hint="re-attach when editing"
      />
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      <motion.div
        drag={isSingle ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x: dragX }}
        animate={{ translateX: `-${imgIndex * 100}%` }}
        transition={SPRING_OPTIONS}
        onDragEnd={onDragEnd}
        className={cn("flex items-center", !isSingle && "cursor-grab active:cursor-grabbing")}
      >
        {normalizedImages.map((img, idx) => (
          <motion.div
            key={img.src + idx}
            animate={{ scale: isSingle ? 1 : imgIndex === idx ? 0.95 : 0.85 }}
            transition={SPRING_OPTIONS}
            className="w-full shrink-0"
            onClick={() => {
              if (!failedByIndex[idx]) onImageClick?.(img, idx);
            }}
          >
            {failedByIndex[idx] ? (
              <UnavailableImageText
                label={unavailableLabel}
                index={idx}
                total={count}
                className="px-2 py-1 text-center"
                hint="re-attach when editing"
              />
            ) : (
              <div
                className={cn(
                  "relative w-full overflow-hidden rounded-xl bg-muted",
                  aspectRatio
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt || `Image ${idx + 1}`}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  draggable={false}
                  onError={() => setFailedByIndex(prev => ({ ...prev, [idx]: true }))}
                />
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {showDots && !isSingle && !allFailed && (
        <div className="mt-3 flex w-full justify-center gap-2">
          {normalizedImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setImgIndex(idx)}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors",
                failedByIndex[idx]
                  ? "bg-destructive/40"
                  : idx === imgIndex
                    ? "bg-foreground"
                    : "bg-muted-foreground/30"
              )}
              aria-label={
                failedByIndex[idx]
                  ? `${unavailableLabel} ${idx + 1} unavailable`
                  : `Go to ${unavailableLabel} ${idx + 1}`
              }
            />
          ))}
        </div>
      )}

      {showGradientEdges && !isSingle && !allFailed && (
        <>
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 w-[10vw] max-w-[100px] bg-gradient-to-r from-background/50 to-transparent" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-[10vw] max-w-[100px] bg-gradient-to-l from-background/50 to-transparent" />
        </>
      )}
    </div>
  );
}

export default SwipeCarousel;
