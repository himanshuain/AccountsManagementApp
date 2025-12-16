"use client";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("skeleton-shimmer animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
