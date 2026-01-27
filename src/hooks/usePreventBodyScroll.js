"use client";

import { useEffect } from "react";

/**
 * Hook to prevent body scroll when modal/sheet is open
 * Useful for bottom sheets, modals, and overlays
 * @param {boolean} isOpen - Whether the modal is open
 */
export function usePreventBodyScroll(isOpen) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isOpen]);
}

export default usePreventBodyScroll;
