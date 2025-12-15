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
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

// Custom hook for swipe gesture
const useSwipeClose = (onClose, side) => {
  const touchStartRef = React.useRef({ y: 0, x: 0 });
  const touchCurrentRef = React.useRef({ y: 0, x: 0 });
  const startTimeRef = React.useRef(0);

  const handleTouchStart = React.useCallback((e) => {
    touchStartRef.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
    touchCurrentRef.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
    startTimeRef.current = Date.now();
  }, []);

  const handleTouchMove = React.useCallback((e) => {
    touchCurrentRef.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    const deltaY = touchCurrentRef.current.y - touchStartRef.current.y;
    const deltaX = touchCurrentRef.current.x - touchStartRef.current.x;
    const deltaTime = Date.now() - startTimeRef.current;
    const velocity = deltaY / deltaTime;

    // For bottom sheets: swipe down to close
    if (side === "bottom") {
      if ((deltaY > 80 || (deltaY > 40 && velocity > 0.3)) && Math.abs(deltaX) < 100) {
        onClose?.();
      }
    }
    // For top sheets: swipe up to close
    else if (side === "top") {
      if ((deltaY < -80 || (deltaY < -40 && velocity < -0.3)) && Math.abs(deltaX) < 100) {
        onClose?.();
      }
    }
  }, [onClose, side]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};

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
  },
);

const SheetContent = React.forwardRef(
  (
    { side = "right", className, children, hideClose = false, onOpenChange, ...props },
    ref,
  ) => {
    const contentRef = React.useRef(null);
    const handleClose = React.useCallback(() => {
      // Trigger close via the close button programmatically
      const closeButton = document.querySelector('[data-sheet-close]');
      if (closeButton) {
        closeButton.click();
      }
    }, []);

    const swipeHandlers = useSwipeClose(handleClose, side);
    const isSwipeable = side === "bottom" || side === "top";

    // Enhanced touch handlers that work on the entire content
    const touchStartRef = React.useRef({ y: 0, x: 0, scrollTop: 0 });
    const [isDragging, setIsDragging] = React.useState(false);

    const handleContentTouchStart = React.useCallback((e) => {
      const scrollableParent = e.target.closest('[data-scroll-area]') || 
                               e.target.closest('.overflow-y-auto') ||
                               e.target.closest('.overflow-auto');
      const scrollTop = scrollableParent?.scrollTop || 0;
      
      touchStartRef.current = { 
        y: e.touches[0].clientY, 
        x: e.touches[0].clientX,
        scrollTop 
      };
      setIsDragging(false);
    }, []);

    const handleContentTouchMove = React.useCallback((e) => {
      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
      const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
      
      // Check if we're at the top of scroll and swiping down (for bottom sheet)
      // or at bottom and swiping up (for top sheet)
      if (side === "bottom" && deltaY > 10 && deltaX < 50 && touchStartRef.current.scrollTop <= 0) {
        setIsDragging(true);
      } else if (side === "top" && deltaY < -10 && deltaX < 50) {
        setIsDragging(true);
      }
    }, [side]);

    const handleContentTouchEnd = React.useCallback((e) => {
      if (!isDragging) return;
      
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
      const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartRef.current.x);
      
      // Close if swiped enough (80px or more) in the correct direction
      if (side === "bottom" && deltaY > 80 && deltaX < 100) {
        handleClose();
      } else if (side === "top" && deltaY < -80 && deltaX < 100) {
        handleClose();
      }
      
      setIsDragging(false);
    }, [isDragging, side, handleClose]);

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
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary z-20"
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
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className,
    )}
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
