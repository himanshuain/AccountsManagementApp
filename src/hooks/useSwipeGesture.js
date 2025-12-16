"use client";

import { useRef, useCallback } from "react";

/**
 * Hook to detect swipe gestures for closing drawers
 * @param {Function} onSwipeDown - Callback when swipe down is detected
 * @param {Object} options - Configuration options
 * @returns {Object} - Touch event handlers
 */
export function useSwipeGesture(onSwipeDown, options = {}) {
  const {
    threshold = 100, // Minimum distance to trigger swipe
    velocityThreshold = 0.3, // Minimum velocity to trigger swipe
  } = options;

  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const touchCurrentY = useRef(0);

  const handleTouchStart = useCallback(e => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchMove = useCallback(e => {
    touchCurrentY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const deltaY = touchCurrentY.current - touchStartY.current;
    const deltaTime = Date.now() - touchStartTime.current;
    const velocity = deltaY / deltaTime;

    // Check if swipe down with sufficient distance or velocity
    if (deltaY > threshold || (deltaY > 50 && velocity > velocityThreshold)) {
      onSwipeDown?.();
    }
  }, [onSwipeDown, threshold, velocityThreshold]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

export default useSwipeGesture;
