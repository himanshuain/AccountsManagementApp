"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * InfiniteScrollTrigger - Place at the end of a list to trigger loading more data
 * Uses IntersectionObserver for efficient scroll detection
 *
 * @param {Function} onLoadMore - Function to call when trigger becomes visible
 * @param {boolean} hasMore - Whether there's more data to load
 * @param {boolean} isLoading - Whether currently loading more data
 * @param {number} loadedCount - Number of items currently loaded
 * @param {number} totalCount - Total number of items available
 * @param {string} className - Additional className for the container
 */
export function InfiniteScrollTrigger({
  onLoadMore,
  hasMore,
  isLoading,
  loadedCount,
  totalCount,
  className = "",
}) {
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        rootMargin: "200px", // Start loading 200px before reaching the end
        threshold: 0.1,
      }
    );

    const currentRef = triggerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  // Don't render anything if no more data
  if (!hasMore && !isLoading) {
    return null;
  }

  const remaining = totalCount - loadedCount;

  return (
    <div
      ref={triggerRef}
      className={`flex items-center justify-center py-4 ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading more...</span>
        </div>
      ) : hasMore ? (
        <button
          onClick={onLoadMore}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Load more ({remaining > 0 ? `${remaining} remaining` : "..."})
        </button>
      ) : null}
    </div>
  );
}

export default InfiniteScrollTrigger;

