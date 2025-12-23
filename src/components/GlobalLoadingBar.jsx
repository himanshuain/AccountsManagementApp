"use client";

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function GlobalLoadingBar() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();

  const isLoading = isFetching > 0 || isMutating > 0;

  if (!isLoading) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] h-1">
      <div className="h-full w-full overflow-hidden bg-primary/20">
        <div
          className={cn(
            "h-full bg-gradient-to-r from-primary via-primary/80 to-primary",
            "animate-loading-bar"
          )}
        />
      </div>
    </div>
  );
}

export default GlobalLoadingBar;
