"use client";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("skeleton-hero rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
