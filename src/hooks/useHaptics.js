"use client";

/**
 * Hook for providing haptic feedback on mobile devices
 * Works on both iOS and Android
 */
export function useHaptics() {
  /**
   * Trigger light haptic feedback (tap)
   */
  const lightImpact = () => {
    if (typeof window === "undefined") return;

    // Try Vibration API first (Android, some iOS)
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    // iOS specific haptic feedback via AudioContext trick
    // This creates a very short "click" that triggers haptic on iOS
    try {
      if ("AudioContext" in window || "webkitAudioContext" in window) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = 0;
        oscillator.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.001);
      }
    } catch (e) {
      // Ignore errors
    }
  };

  /**
   * Trigger medium haptic feedback (button press)
   */
  const mediumImpact = () => {
    if (typeof window === "undefined") return;

    if ("vibrate" in navigator) {
      navigator.vibrate(20);
    }
  };

  /**
   * Trigger heavy haptic feedback (error, important action)
   */
  const heavyImpact = () => {
    if (typeof window === "undefined") return;

    if ("vibrate" in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  };

  /**
   * Trigger success haptic pattern
   */
  const success = () => {
    if (typeof window === "undefined") return;

    if ("vibrate" in navigator) {
      navigator.vibrate([10, 30, 10]);
    }
  };

  /**
   * Trigger error haptic pattern
   */
  const error = () => {
    if (typeof window === "undefined") return;

    if ("vibrate" in navigator) {
      navigator.vibrate([50, 30, 50, 30, 50]);
    }
  };

  /**
   * Trigger selection change haptic
   */
  const selection = () => {
    if (typeof window === "undefined") return;

    if ("vibrate" in navigator) {
      navigator.vibrate(5);
    }
  };

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    success,
    error,
    selection,
  };
}

// Standalone functions for direct use
export const haptics = {
  light: () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  },
  medium: () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(20);
    }
  },
  heavy: () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([30, 50, 30]);
    }
  },
  success: () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([10, 30, 10]);
    }
  },
  error: () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([50, 30, 50, 30, 50]);
    }
  },
};

export default useHaptics;
