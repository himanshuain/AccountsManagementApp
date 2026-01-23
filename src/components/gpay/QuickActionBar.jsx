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
  className,
}) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30",
        "border-t border-border bg-background/95 backdrop-blur-sm",
        "shadow-[0_-8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.45)]",
        "safe-area-bottom pb-4 lg:pb-0",
        "lg:static lg:border-t-0 lg:shadow-none",
        className
      )}
    >
      <div className="flex items-center gap-2 p-3 pt-2">
        {/* Primary Action Button */}
        <Button
          onClick={() => {
            haptics.light();
            onPrimaryAction?.();
          }}
          disabled={disabled}
          className={cn(
            "h-10 rounded-full px-4",
            "bg-primary text-primary-foreground",
            "transition-transform hover:bg-primary/90 active:scale-95"
          )}
        >
          <Plus className="mr-1 h-4 w-4" />
          {primaryAction}
        </Button>

        {/* Input Field */}
        {showInput ? (
          <div className="relative flex-1">
            <Input
              value={inputValue}
              onChange={e => onInputChange?.(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="h-10 rounded-full border-0 bg-muted pr-10"
              onKeyDown={e => {
                if (e.key === "Enter" && inputValue.trim()) {
                  onInputSubmit?.(inputValue);
                }
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full"
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
              className="h-10 flex-1 rounded-full px-4"
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
  className,
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
        "transition-all active:scale-95",
        "hw-accelerate",
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border bg-card text-foreground hover:bg-muted",
        label ? "px-5 py-3" : "p-4",
        positionClasses[position],
        className
      )}
    >
      <Icon className="h-5 w-5" />
      {label && <span className="text-sm font-medium">{label}</span>}
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
  className,
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
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
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
              "flex items-center gap-2 rounded-full px-4 py-2.5",
              "border bg-card shadow-lg",
              "transition-transform active:scale-95",
              "animate-slide-in-right"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="text-sm font-medium">{item.label}</span>
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                item.color || "bg-primary text-primary-foreground"
              )}
            >
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
          "transition-all duration-200 active:scale-95",
          "lg:bottom-6",
          open
            ? "rotate-45 bg-destructive text-destructive-foreground"
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
export function QuickCaptureBar({ onCapture, onGallery, disabled = false, className }) {
  return (
    <div className={cn("flex items-center gap-3 p-3", className)}>
      <Button
        variant="outline"
        className="h-12 flex-1 gap-2"
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
        className="h-12 flex-1 gap-2"
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
