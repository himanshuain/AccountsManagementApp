"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { X } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

const Drawer = ({ shouldScaleBackground = true, ...props }) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerNested = DrawerPrimitive.NestedRoot;

const DrawerOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-[100] bg-black/40", className)}
    {...props}
  />
));
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[100] mt-24 flex max-h-[96vh] flex-col overflow-y-auto rounded-t-[20px] bg-card shadow-[0_-8px_30px_rgba(0,0,0,0.12)]",
          className
        )}
        {...props}
      >
        <div data-drawer-handle="" className="mx-auto mt-3 h-1 w-8 shrink-0 rounded-full bg-muted-foreground/20" />
        {children}
        <div aria-hidden="true" className="pointer-events-none shrink-0 h-px" />
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "font-heading text-lg font-semibold leading-none tracking-wide",
      className
    )}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";

const DrawerCloseButton = React.forwardRef(
  ({ className, onClick, size = "default", ...props }, ref) => {
    const btnRef = React.useRef(null);
    const mergedRef = ref || btnRef;

    const handleClick = (e) => {
      const btn = e.currentTarget;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      const diameter = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${diameter}px`;
      ripple.style.left = `${e.clientX - rect.left - diameter / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - diameter / 2}px`;
      ripple.className = "ripple";
      const existing = btn.querySelector(".ripple");
      if (existing) existing.remove();
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
      onClick?.(e);
    };

    const sizeClasses = size === "sm" ? "h-8 w-8" : "h-9 w-9";
    const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

    return (
      <motion.button
        ref={mergedRef}
        type="button"
        whileTap={{ scale: 0.82 }}
        whileHover={{ scale: 1.06 }}
        transition={{ type: "spring", stiffness: 500, damping: 18 }}
        onClick={handleClick}
        className={cn("glassy-close-btn", sizeClasses, className)}
        aria-label="Close"
        {...props}
      >
        <X className={cn(iconSize, "text-muted-foreground")} strokeWidth={2.5} />
      </motion.button>
    );
  }
);
DrawerCloseButton.displayName = "DrawerCloseButton";

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerNested,
  DrawerCloseButton,
};
