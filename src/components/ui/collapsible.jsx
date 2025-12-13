"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const CollapsibleContext = React.createContext({
  open: false,
  onOpenChange: () => {},
});

const Collapsible = React.forwardRef(
  ({ open, onOpenChange, defaultOpen = false, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);
    const openState = open !== undefined ? open : isOpen;

    const handleOpenChange = React.useCallback(
      (newOpen) => {
        if (open === undefined) {
          setIsOpen(newOpen);
        }
        onOpenChange?.(newOpen);
      },
      [open, onOpenChange],
    );

    return (
      <CollapsibleContext.Provider
        value={{ open: openState, onOpenChange: handleOpenChange }}
      >
        <div ref={ref} {...props}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    );
  },
);
Collapsible.displayName = "Collapsible";

const CollapsibleTrigger = React.forwardRef(
  ({ asChild, children, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(CollapsibleContext);

    const handleClick = (e) => {
      onOpenChange(!open);
      props.onClick?.(e);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ref,
        ...props,
        onClick: handleClick,
        "aria-expanded": open,
      });
    }

    return (
      <button
        ref={ref}
        type="button"
        aria-expanded={open}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  },
);
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    const { open } = React.useContext(CollapsibleContext);

    if (!open) return null;

    return (
      <div
        ref={ref}
        className={cn("animate-in fade-in-0 slide-in-from-top-2", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
