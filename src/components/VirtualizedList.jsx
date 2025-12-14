"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/**
 * VirtualizedList - Renders only visible items for performance with large lists
 * 
 * @param {Array} items - Array of items to render
 * @param {Function} renderItem - Function to render each item: (item, index) => JSX
 * @param {number} estimateSize - Estimated height of each item in pixels
 * @param {string} className - Additional className for the container
 * @param {Function} onEndReached - Callback when scrolled to end (for infinite scroll)
 * @param {number} endReachedThreshold - Number of items from end to trigger onEndReached
 * @param {boolean} loading - Whether more items are being loaded
 */
export function VirtualizedList({
  items = [],
  renderItem,
  estimateSize = 100,
  className = "",
  onEndReached,
  endReachedThreshold = 5,
  loading = false,
  overscan = 5,
}) {
  const parentRef = useRef(null);
  const endReachedCalledRef = useRef(false);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Check if we need to load more
  const handleScroll = useCallback(() => {
    if (!onEndReached || loading || endReachedCalledRef.current) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (lastItem.index >= items.length - endReachedThreshold) {
      endReachedCalledRef.current = true;
      onEndReached();
      // Reset after a delay to allow for new items
      setTimeout(() => {
        endReachedCalledRef.current = false;
      }, 1000);
    }
  }, [virtualItems, items.length, endReachedThreshold, onEndReached, loading]);

  // Call handleScroll when virtual items change
  if (virtualItems.length > 0) {
    handleScroll();
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
      
      {loading && (
        <div className="py-4 text-center text-muted-foreground text-sm">
          Loading more...
        </div>
      )}
    </div>
  );
}

/**
 * Simple virtualized list that works with dynamic heights
 * Uses a simpler approach with intersection observer
 */
export function SimpleVirtualList({
  items = [],
  renderItem,
  batchSize = 20,
  className = "",
}) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < items.length) {
          setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, items.length, batchSize]);

  // Reset visible count when items change significantly
  useEffect(() => {
    if (items.length <= batchSize) {
      setVisibleCount(items.length);
    }
  }, [items.length, batchSize]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className={className}>
      {visibleItems.map((item, index) => renderItem(item, index))}
      
      {visibleCount < items.length && (
        <div 
          ref={loadMoreRef} 
          className="py-4 text-center text-muted-foreground text-sm"
        >
          Scroll for more ({items.length - visibleCount} remaining)
        </div>
      )}
    </div>
  );
}

export default VirtualizedList;

