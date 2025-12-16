"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the virtual keyboard is visible on mobile devices
 * Uses visualViewport API for accurate detection
 */
export function useKeyboardVisible() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const handleResize = () => {
      if (window.visualViewport) {
        // Calculate if keyboard is likely open
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const heightDiff = windowHeight - viewportHeight;

        // If viewport is significantly smaller than window, keyboard is likely open
        // Using 150px as threshold to account for keyboard
        const isOpen = heightDiff > 150;
        setIsKeyboardVisible(isOpen);
        setKeyboardHeight(isOpen ? heightDiff : 0);
      }
    };

    // Listen to visualViewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    }

    // Also listen to focus events on inputs
    const handleFocus = e => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT"
      ) {
        // Small delay to let keyboard open
        setTimeout(handleResize, 300);
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }, 100);
    };

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
}

export default useKeyboardVisible;
