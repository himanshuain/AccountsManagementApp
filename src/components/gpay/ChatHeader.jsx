"use client";

import { ChevronLeft, Phone, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonAvatar } from "./PersonAvatar";
import { haptics } from "@/hooks/useHaptics";

/**
 * GPay-style chat header with back button, avatar, name, and actions
 */

export function ChatHeader({
  name,
  subtitle, // phone number or secondary info
  image,
  onBack,
  onCall,
  onProfileClick,
  menuItems = [], // [{ label, icon, onClick, destructive }]
  className
}) {
  const handleCall = () => {
    haptics.light();
    onCall?.();
  };

  const handleProfile = () => {
    haptics.light();
    onProfileClick?.();
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-2",
      "bg-background/95 backdrop-blur-sm",
      "border-b border-border",
      "sticky top-0 z-30",
      className
    )}>
      {/* Back Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          haptics.light();
          onBack?.();
        }}
        className="h-10 w-10 rounded-full flex-shrink-0"
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      {/* Avatar and Name - Clickable for profile */}
      <button
        onClick={handleProfile}
        className="flex items-center gap-3 flex-1 min-w-0 active:opacity-70 transition-opacity"
      >
        <PersonAvatar 
          name={name} 
          image={image} 
          size="md"
        />
        
        <div className="flex-1 min-w-0 text-left">
          <h1 className="font-semibold truncate">{name || "Unknown"}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </button>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Call Button */}
        {onCall && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCall}
            className="h-10 w-10 rounded-full"
          >
            <Phone className="h-5 w-5" />
          </Button>
        )}

        {/* Menu */}
        {menuItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {menuItems.map((item, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => {
                    haptics.light();
                    item.onClick?.();
                  }}
                  className={cn(
                    item.destructive && "text-destructive focus:text-destructive"
                  )}
                >
                  {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/**
 * Compact header variant for sheets/modals
 */
export function CompactHeader({
  title,
  subtitle,
  onClose,
  rightAction,
  className
}) {
  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-3",
      "border-b border-border",
      className
    )}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          haptics.light();
          onClose?.();
        }}
      >
        Cancel
      </Button>

      <div className="text-center">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {rightAction ? (
        <Button
          size="sm"
          onClick={() => {
            haptics.light();
            rightAction.onClick?.();
          }}
          disabled={rightAction.disabled}
          className={rightAction.className}
        >
          {rightAction.label}
        </Button>
      ) : (
        <div className="w-16" /> // Spacer for centering
      )}
    </div>
  );
}

/**
 * Section header for lists
 */
export function SectionHeader({
  title,
  action,
  onAction,
  className
}) {
  return (
    <div className={cn(
      "flex items-center justify-between px-1 py-2",
      className
    )}>
      <h3 className="text-sm font-semibold text-muted-foreground">
        {title}
      </h3>
      {action && (
        <button
          onClick={() => {
            haptics.light();
            onAction?.();
          }}
          className="text-xs text-primary font-medium active:opacity-70"
        >
          {action}
        </button>
      )}
    </div>
  );
}

export default ChatHeader;





