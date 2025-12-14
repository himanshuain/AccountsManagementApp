"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook for progressive loading of list items
 * Shows initial batch and loads more as user scrolls
 * 
 * @param {Array} items - Full list of items
 * @param {number} initialCount - Initial number of items to show
 * @param {number} batchSize - Number of items to load per batch
 * @returns {Object} - { visibleItems, hasMore, loadMore, loadMoreRef, reset }
 */
export function useProgressiveList(items = [], initialCount = 20, batchSize = 20) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const loadMoreRef = useRef(null);
  const prevItemsLength = useRef(items.length);

  // Reset visible count when items change significantly (e.g., filter change)
  useEffect(() => {
    // If items length decreased significantly or is now less than visible count
    if (items.length < prevItemsLength.current * 0.5 || items.length < visibleCount) {
      setVisibleCount(Math.min(initialCount, items.length));
    }
    prevItemsLength.current = items.length;
  }, [items.length, initialCount, visibleCount]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < items.length) {
          setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [visibleCount, items.length, batchSize]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
  }, [batchSize, items.length]);

  const reset = useCallback(() => {
    setVisibleCount(initialCount);
  }, [initialCount]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  const remainingCount = items.length - visibleCount;

  return {
    visibleItems,
    hasMore,
    loadMore,
    loadMoreRef,
    reset,
    remainingCount,
    totalCount: items.length,
    visibleCount,
  };
}

/**
 * LoadMoreTrigger component to place at the end of a list
 */
export function LoadMoreTrigger({ loadMoreRef, hasMore, remainingCount, onLoadMore }) {
  if (!hasMore) return null;

  return (
    <div 
      ref={loadMoreRef}
      className="py-4 text-center"
    >
      <button
        onClick={onLoadMore}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Load more ({remainingCount} remaining)
      </button>
    </div>
  );
}

export default useProgressiveList;

