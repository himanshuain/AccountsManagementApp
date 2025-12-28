"use client";

import { useState } from "react";
import { Plus, Send, Camera, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { haptics } from "@/hooks/useHaptics";

/**
 * GPay-style quick action bar for bottom of chat view
 * Includes quick add button and message-style input
 */

export function QuickActionBar({
  placeholder = "Message...",
  primaryAction = "Add Bill",
  onPrimaryAction,
  onSecondaryAction,
  secondaryAction = "Record Payment",
  showInput = true,
  inputValue = "",
  onInputChange,
  onInputSubmit,
  disabled = false,
  className
}) {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-30",
      "bg-background/95 backdrop-blur-sm border-t border-border",
      "safe-area-bottom pb-4 lg:pb-0",
      "lg:static lg:border-t-0",
      className
    )}>
      <div className="flex items-center gap-2 p-3 pt-2">
        {/* Primary Action Button */}
        <Button
          onClick={() => {
            haptics.light();
            onPrimaryAction?.();
          }}
          disabled={disabled}
          className={cn(
            "h-10 px-4 rounded-full",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 active:scale-95 transition-transform"
          )}
        >
          <Plus className="h-4 w-4 mr-1" />
          {primaryAction}
        </Button>

        {/* Input Field */}
        {showInput ? (
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => onInputChange?.(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="h-10 pr-10 rounded-full bg-muted border-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputValue.trim()) {
                  onInputSubmit?.(inputValue);
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
              onClick={() => {
                if (inputValue.trim()) {
                  haptics.light();
                  onInputSubmit?.(inputValue);
                }
              }}
              disabled={disabled || !inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          // Secondary Action Button (when no input)
          onSecondaryAction && (
            <Button
              variant="outline"
              onClick={() => {
                haptics.light();
                onSecondaryAction?.();
              }}
              disabled={disabled}
              className="h-10 px-4 rounded-full flex-1"
            >
              {secondaryAction}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Compact FAB-style action button
 */
export function FloatingActionButton({
  icon: Icon = Plus,
  label,
  onClick,
  variant = "primary", // "primary" | "secondary"
  position = "bottom-right", // "bottom-right" | "bottom-center"
  className
}) {
  const positionClasses = {
    "bottom-right": "bottom-20 right-4 lg:bottom-6",
    "bottom-center": "bottom-20 left-1/2 -translate-x-1/2 lg:bottom-6",
  };

  return (
    <button
      onClick={() => {
        haptics.medium();
        onClick?.();
      }}
      className={cn(
        "fixed z-40 flex items-center gap-2",
        "rounded-full shadow-lg",
        "active:scale-95 transition-all",
        "hw-accelerate",
        variant === "primary" 
          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
          : "bg-card text-foreground border hover:bg-muted",
        label ? "px-5 py-3" : "p-4",
        positionClasses[position],
        className
      )}
    >
      <Icon className="h-5 w-5" />
      {label && <span className="font-medium text-sm">{label}</span>}
    </button>
  );
}

/**
 * Expandable FAB menu
 */
export function FABMenu({
  items = [],
  open = false,
  onOpenChange,
  mainIcon: MainIcon = Plus,
  className
}) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => onOpenChange?.(false)}
        />
      )}

      {/* Menu Items */}
      <div
        className={cn(
          "fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2",
          "transition-all duration-200",
          open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
          className
        )}
      >
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              haptics.light();
              item.onClick?.();
              onOpenChange?.(false);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full",
              "bg-card border shadow-lg",
              "active:scale-95 transition-transform",
              "animate-slide-in-right",
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="text-sm font-medium">{item.label}</span>
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center",
              item.color || "bg-primary text-primary-foreground"
            )}>
              {item.icon && <item.icon className="h-5 w-5" />}
            </div>
          </button>
        ))}
      </div>

      {/* Main FAB */}
      <button
        onClick={() => {
          haptics.light();
          onOpenChange?.(!open);
        }}
        className={cn(
          "fixed bottom-20 right-4 z-50 h-14 w-14",
          "rounded-full shadow-lg",
          "flex items-center justify-center",
          "active:scale-95 transition-all duration-200",
          "lg:bottom-6",
          open 
            ? "bg-destructive text-destructive-foreground rotate-45" 
            : "bg-primary text-primary-foreground"
        )}
      >
        <MainIcon className="h-6 w-6" />
      </button>
    </>
  );
}

/**
 * Quick capture bar with camera and gallery
 */
export function QuickCaptureBar({
  onCapture,
  onGallery,
  disabled = false,
  className
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3",
      className
    )}>
      <Button
        variant="outline"
        className="flex-1 h-12 gap-2"
        onClick={() => {
          haptics.light();
          onCapture?.();
        }}
        disabled={disabled}
      >
        <Camera className="h-5 w-5" />
        Camera
      </Button>
      
      <Button
        variant="outline"
        className="flex-1 h-12 gap-2"
        onClick={() => {
          haptics.light();
          onGallery?.();
        }}
        disabled={disabled}
      >
        <ImageIcon className="h-5 w-5" />
        Gallery
      </Button>
    </div>
  );
}

export default QuickActionBar;

