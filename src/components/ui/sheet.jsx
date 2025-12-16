"use client";
import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

const SheetContent = React.forwardRef(
  (
    {
      side = "right",
      className,
      children,
      hideClose = false,
      onOpenChange,
      onSwipeClose,
      disableSwipeClose = false,
      ...props
    },
    ref
  ) => {
    const handleClose = React.useCallback(() => {
      // If onSwipeClose is provided, call it and let it handle the close
      // This allows forms to show confirmation dialogs
      if (onSwipeClose) {
        onSwipeClose();
        return;
      }
      // Trigger close via the close button programmatically
      const closeButton = document.querySelector("[data-sheet-close]");
      if (closeButton) {
        closeButton.click();
      }
    }, [onSwipeClose]);

    const isSwipeable = (side === "bottom" || side === "top") && !disableSwipeClose;

    // Swipe handlers that ONLY work from the drag handle area
    const touchStartRef = React.useRef({ y: 0, x: 0, fromDragHandle: false });
    const [isDragging, setIsDragging] = React.useState(false);

    const handleContentTouchStart = React.useCallback(
      e => {
        // Skip if swipe close is disabled
        if (disableSwipeClose) return;

        // Check if touch started on or near the drag handle
        // The drag handle is the div with the rounded bar at the top
        const dragHandle = e.target.closest("[data-drag-handle]");
        const isFromDragHandle = !!dragHandle;
        const sheetSwipeMargin = 120;

        // Also check if touch started in the header area (first ~60px of the sheet)
        // This provides a larger touch target for closing
        const sheetContent = e.currentTarget;
        const rect = sheetContent.getBoundingClientRect();
        const touchY = e.touches[0].clientY;
        const isNearTop = side === "bottom" && touchY - rect.top < sheetSwipeMargin;
        const isNearBottom = side === "top" && rect.bottom - touchY < sheetSwipeMargin;

        // Only allow swipe from drag handle area or very top of sheet
        const canSwipe = isFromDragHandle || isNearTop || isNearBottom;

        touchStartRef.current = {
          y: e.touches[0].clientY,
          x: e.touches[0].clientX,
          fromDragHandle: canSwipe,
        };
        setIsDragging(false);
      },
      [disableSwipeClose, side]
    );

    const handleContentTouchMove = React.useCallback(
      e => {
        // Skip if swipe close is disabled or touch didn't start from drag handle
        if (disableSwipeClose || !touchStartRef.current.fromDragHandle) return;

        const deltaY = e.touches[0].clientY - touchStartRef.current.y;
        const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current.x);

        // Check swipe direction based on sheet side
        if (side === "bottom" && deltaY > 10 && deltaX < 50) {
          setIsDragging(true);
        } else if (side === "top" && deltaY < -10 && deltaX < 50) {
          setIsDragging(true);
        }
      },
      [side, disableSwipeClose]
    );

    const handleContentTouchEnd = React.useCallback(
      e => {
        // Skip if swipe close is disabled
        if (disableSwipeClose) return;
        if (!isDragging || !touchStartRef.current.fromDragHandle) {
          setIsDragging(false);
          return;
        }

        const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
        const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartRef.current.x);

        // Close if swiped enough (80px or more) in the correct direction
        if (side === "bottom" && deltaY > 80 && deltaX < 100) {
          handleClose();
        } else if (side === "top" && deltaY < -80 && deltaX < 100) {
          handleClose();
        }

        setIsDragging(false);
      },
      [isDragging, side, handleClose, disableSwipeClose]
    );

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={ref}
          className={cn(sheetVariants({ side }), className)}
          onTouchStart={isSwipeable ? handleContentTouchStart : undefined}
          onTouchMove={isSwipeable ? handleContentTouchMove : undefined}
          onTouchEnd={isSwipeable ? handleContentTouchEnd : undefined}
          {...props}
        >
          {!hideClose && (
            <SheetPrimitive.Close
              data-sheet-close
              className="absolute right-4 top-4 z-20 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          )}
          {/* Hidden close button for swipe gesture */}
          {hideClose && (
            <SheetPrimitive.Close data-sheet-close className="sr-only">
              <span>Close</span>
            </SheetPrimitive.Close>
          )}
          {children}
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  }
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
