"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/image-url";

/**
 * Superhero-themed circular avatar with colored fallback
 * Miles Morales (light) + Iron Man (dark) color schemes
 */

// Theme-aware avatar colors
const getAvatarColor = (name) => {
  const colors = [
    // Miles Morales inspired (reds, purples, pinks)
    "bg-red-600",
    "bg-rose-600",
    "bg-pink-600",
    "bg-fuchsia-600",
    "bg-purple-600",
    // Iron Man inspired (golds, oranges, cyans)
    "bg-amber-600",
    "bg-orange-600",
    "bg-yellow-600",
    "bg-cyan-600",
    "bg-teal-600",
  ];
  
  if (!name) return colors[0];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Get initials from name
const getInitials = (name) => {
  if (!name) return "?";
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export function PersonAvatar({ 
  name, 
  image, 
  size = "md",
  showBadge = false,
  badgeContent,
  badgeColor = "bg-red-500",
  className,
  onClick
}) {
  const avatarColor = useMemo(() => getAvatarColor(name), [name]);
  const initials = useMemo(() => getInitials(name), [name]);
  const imageUrl = image ? resolveImageUrl(image) : null;
  
  const sizeClasses = {
    xs: "h-8 w-8 text-xs",
    sm: "h-10 w-10 text-sm",
    md: "h-12 w-12 text-base",
    lg: "h-16 w-16 text-xl",
    xl: "h-20 w-20 text-2xl",
    "2xl": "h-24 w-24 text-3xl",
  };
  
  const badgeSizeClasses = {
    xs: "h-3 w-3 -right-0.5 -bottom-0.5",
    sm: "h-4 w-4 -right-0.5 -bottom-0.5",
    md: "h-5 w-5 -right-1 -bottom-1",
    lg: "h-6 w-6 -right-1 -bottom-1",
    xl: "h-7 w-7 -right-1 -bottom-1",
  };

  return (
    <div 
      className={cn(
        "relative inline-flex flex-shrink-0",
        onClick && "cursor-pointer active:scale-95 transition-transform",
        className
      )}
      onClick={onClick}
    >
      {/* Avatar Circle with theme ring */}
      <div
        className={cn(
          "rounded-full overflow-hidden flex items-center justify-center font-bold text-white",
          "hw-accelerate",
          "ring-2 ring-background",
          // Dark mode arc reactor glow effect
          "dark:shadow-[0_0_10px_rgba(0,212,255,0.2)]",
          sizeClasses[size],
          !imageUrl && avatarColor
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name || "Avatar"}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="select-none font-heading tracking-wide">{initials}</span>
        )}
      </div>

      {/* Badge */}
      {showBadge && (
        <div
          className={cn(
            "absolute rounded-full flex items-center justify-center",
            "text-white text-[10px] font-bold font-mono",
            "ring-2 ring-background",
            badgeSizeClasses[size],
            badgeColor
          )}
        >
          {badgeContent}
        </div>
      )}
    </div>
  );
}

/**
 * Avatar with name below (for grid layout)
 * Supports both onClick and href (Link) for navigation
 */
export function PersonAvatarWithName({
  name,
  image,
  subtitle,
  amount,
  amountColor,
  size = "lg",
  onClick,
  href,
  className
}) {
  const content = (
    <>
      <PersonAvatar name={name} image={image} size={size} />
      
      <div className="text-center w-full">
        <p className="text-xs font-medium truncate max-w-[72px]">
          {name || "Unknown"}
        </p>
        
        {subtitle && (
          <p className="text-[10px] text-muted-foreground truncate max-w-[72px]">
            {subtitle}
          </p>
        )}
        
        {amount !== undefined && (
          <p className={cn(
            "text-[11px] font-bold font-mono mt-0.5",
            amountColor || "amount-pending"
          )}>
            ₹{amount.toLocaleString("en-IN")}
          </p>
        )}
      </div>
    </>
  );

  const sharedClasses = cn(
    "flex flex-col items-center gap-1.5 p-2 px-8",
    "active:scale-95 transition-transform cursor-pointer",
    "rounded-2xl hover:bg-accent/20",
    className
  );

  // Use Link for navigation with prefetch
  if (href) {
    return (
      <Link href={href} className={sharedClasses} prefetch={true}>
        {content}
      </Link>
    );
  }

  // Fallback to div with onClick
  return (
    <div className={sharedClasses} onClick={onClick}>
      {content}
    </div>
  );
}

/**
 * Skeleton loader for PersonAvatar
 */
export function PersonAvatarSkeleton({ size = "md" }) {
  const sizeClasses = {
    xs: "h-8 w-8",
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-20 w-20",
  };

  return (
    <div className={cn(
      "rounded-full skeleton-hero",
      sizeClasses[size]
    )} />
  );
}

export default PersonAvatar;
