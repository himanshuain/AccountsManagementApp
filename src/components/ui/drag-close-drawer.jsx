"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import useMeasure from "react-use-measure";
import {
  useDragControls,
  useMotionValue,
  useAnimate,
  motion,
  animate as animateValue,
} from "motion/react";
import { cn } from "@/lib/utils";

function DragCloseDrawer({
  open,
  setOpen,
  onOpenChange,
  beforeClose,
  children,
  className,
  height = "h-[75vh]",
  overlayClassName,
}) {
  const [scope, scopeAnimate] = useAnimate();
  const [drawerRef, { height: measuredHeight }] = useMeasure();

  const y = useMotionValue(0);
  const controls = useDragControls();
  const contentRef = useRef(null);
  const handleCloseRef = useRef(null);

  const handleSetOpen = useCallback(
    (val) => {
      if (onOpenChange) onOpenChange(val);
      else if (setOpen) setOpen(val);
    },
    [onOpenChange, setOpen]
  );

  const handleClose = useCallback(async () => {
    if (beforeClose) {
      const canClose = await beforeClose();
      if (!canClose) {
        animateValue(y, 0, { type: "spring", stiffness: 300, damping: 30 });
        return;
      }
    }
    scopeAnimate(scope.current, { opacity: [1, 0] });
    const yStart = typeof y.get() === "number" ? y.get() : 0;
    await scopeAnimate("#drawer", { y: [yStart, measuredHeight || 800] });
    handleSetOpen(false);
  }, [beforeClose, scopeAnimate, scope, y, measuredHeight, handleSetOpen]);

  handleCloseRef.current = handleClose;

  // Lock body scroll while drawer is open to prevent background scroll bleed-through
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Swipe-down-to-close from inside the scrollable content area.
  // Walks up from the touch target to find the nearest scrollable ancestor
  // so it works even inside nested ScrollArea / overflow-y-auto containers.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let startY = 0;
    let startX = 0;
    let startScrollTop = 0;
    let scrollTarget = null;
    let isDragging = false;
    let gestureDecided = false;

    function findScrollableAncestor(target) {
      let node = target;
      while (node && node !== el) {
        if (node.scrollHeight > node.clientHeight) {
          const { overflowY } = getComputedStyle(node);
          if (overflowY === "auto" || overflowY === "scroll") return node;
        }
        node = node.parentElement;
      }
      return el;
    }

    function onTouchStart(e) {
      scrollTarget = findScrollableAncestor(e.target);
      startScrollTop = scrollTarget.scrollTop;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isDragging = false;
      gestureDecided = false;
    }

    function onTouchMove(e) {
      const deltaY = e.touches[0].clientY - startY;
      const deltaX = Math.abs(e.touches[0].clientX - startX);
      const scrollTop = scrollTarget ? scrollTarget.scrollTop : 0;

      // Ignore horizontal swipes (e.g. carousel interactions)
      if (!gestureDecided && (deltaX > 8 || Math.abs(deltaY) > 8)) {
        gestureDecided = true;
        if (deltaX > Math.abs(deltaY)) return;
      }
      if (gestureDecided && deltaX > Math.abs(deltaY) && !isDragging) return;

      if (startScrollTop <= 0 && scrollTop <= 0 && deltaY > 0) {
        if (!isDragging && deltaY > 8) {
          isDragging = true;
        }
        if (isDragging) {
          e.preventDefault();
          y.set(deltaY);
        }
      } else if (isDragging && deltaY <= 0) {
        isDragging = false;
        animateValue(y, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    }

    function onTouchEnd() {
      if (isDragging) {
        isDragging = false;
        if (y.get() >= 100) {
          handleCloseRef.current?.();
        } else {
          animateValue(y, 0, { type: "spring", stiffness: 300, damping: 30 });
        }
      }
      scrollTarget = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [y]);

  if (!open) return null;

  return createPortal(
    <motion.div
      ref={scope}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={handleClose}
      className={cn("fixed inset-0 z-50 bg-black/70 touch-none", overlayClassName)}
    >
      <motion.div
        id="drawer"
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: "0%" }}
        transition={{ ease: "easeInOut" }}
        className={cn(
          "absolute bottom-0 flex w-full touch-auto flex-col overflow-hidden rounded-t-3xl bg-card",
          height,
          className
        )}
        style={{ y }}
        drag="y"
        dragControls={controls}
        onDragEnd={() => {
          if (y.get() >= 100) {
            handleClose();
          }
        }}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
      >
        <div className="flex shrink-0 justify-center bg-card p-4">
          <button
            onPointerDown={(e) => controls.start(e)}
            className="h-2 w-14 cursor-grab touch-none rounded-full bg-muted-foreground/30 active:cursor-grabbing"
          />
        </div>
        <div
          ref={contentRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-nav"
        >
          {children}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function DrawerHeader({ children, className }) {
  return (
    <div className={cn("mb-4 flex items-center justify-between", className)}>
      {children}
    </div>
  );
}

function DrawerTitle({ children, className }) {
  return (
    <h3 className={cn("font-heading text-lg font-semibold tracking-wide", className)}>
      {children}
    </h3>
  );
}

export { DragCloseDrawer, DrawerHeader, DrawerTitle };
