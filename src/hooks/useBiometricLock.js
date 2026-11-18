"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  RELOCK_TIMEOUT_MS,
  markUnlocked,
  clearUnlock,
  touchUnlockTimestamp,
  isUnlockValid,
  syncUnlockFromSessionOnMount,
  readBiometricSettingsFromStorage,
  writeBiometricSettingsToStorage,
} from "@/lib/biometricSession";

/**
 * Hook for managing biometric lock functionality
 * Uses localStorage for settings and session storage for unlock state
 * Auto-locks after 20 seconds of inactivity (modal close)
 */
export function useBiometricLock() {
  const [settings, setSettings] = useState({
    enabled: false,
    protectIncome: false,
    protectReports: false,
  });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const relockTimerRef = useRef(null);

  // Check if biometrics is available
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        // Check if PublicKeyCredential is available
        if (window.PublicKeyCredential) {
          // Check if platform authenticator is available (fingerprint, face ID, etc.)
          const available =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsBiometricAvailable(available);
        } else {
          setIsBiometricAvailable(false);
        }
      } catch (error) {
        console.error("Error checking biometric availability:", error);
        setIsBiometricAvailable(false);
      }
      setIsChecking(false);
    };

    checkBiometricAvailability();
  }, []);

  // Load settings from localStorage and check unlock expiry
  useEffect(() => {
    const stored = readBiometricSettingsFromStorage();
    if (stored) {
      setSettings(prev => ({ ...prev, ...stored }));
    }
    setIsUnlocked(syncUnlockFromSessionOnMount());
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (relockTimerRef.current) {
        clearTimeout(relockTimerRef.current);
      }
    };
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback(
    newSettings => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      writeBiometricSettingsToStorage(updated);
    },
    [settings]
  );

  const applyUnlock = useCallback(() => {
    setIsUnlocked(true);
    markUnlocked();
  }, []);

  // Request biometric authentication
  // forceCheck = true means always prompt for biometric (used for settings protection)
  const requestUnlock = useCallback(
    async (forceCheck = false) => {
      // Check latest settings from localStorage in case state isn't updated yet
      const stored = readBiometricSettingsFromStorage();
      const currentSettings = stored ? { ...settings, ...stored } : settings;

      // If not forcing check and biometric is not enabled, just unlock
      if (!forceCheck && (!currentSettings.enabled || !isBiometricAvailable)) {
        applyUnlock();
        return { success: true };
      }

      // If biometric is not available, can't do anything
      if (!isBiometricAvailable) {
        return { success: false, error: "Biometric not available" };
      }

      try {
        // Generate a random challenge
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        // Create credential request options for biometric authentication
        const publicKeyCredentialRequestOptions = {
          challenge: challenge,
          timeout: 60000,
          userVerification: "required",
          rpId: window.location.hostname,
        };

        // Try to get existing credentials (this will trigger biometric prompt)
        // If no credentials exist, we'll use the simpler approach
        try {
          // Use navigator.credentials.get with mediation: "required" to force biometric check
          const credential = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions,
            mediation: "required",
          });

          if (credential) {
            applyUnlock();
            return { success: true };
          }
        } catch (credError) {
          // If no credentials, fall back to creating a temporary one for verification
          // This approach works better for simple "verify user is present" scenarios
          console.log("Credential get failed, trying alternative method");
        }

        // Alternative: Create a temporary credential (this will prompt for biometric)
        const createOptions = {
          publicKey: {
            challenge: challenge,
            rp: {
              name: "Shop Manager",
              id: window.location.hostname,
            },
            user: {
              id: new Uint8Array([1]),
              name: "user@local",
              displayName: "Local User",
            },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 }, // ES256
              { type: "public-key", alg: -257 }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
            },
            timeout: 60000,
          },
        };

        const newCredential = await navigator.credentials.create(createOptions);

        if (newCredential) {
          applyUnlock();
          return { success: true };
        }

        return { success: false, error: "Authentication failed" };
      } catch (error) {
        console.error("Biometric authentication error:", error);

        // If user cancelled or error occurred, don't unlock
        if (error.name === "NotAllowedError") {
          return { success: false, error: "Authentication cancelled" };
        }

        return { success: false, error: error.message || "Authentication failed" };
      }
    },
    [settings.enabled, isBiometricAvailable, applyUnlock]
  );

  // Lock the session
  const lock = useCallback(() => {
    if (relockTimerRef.current) {
      clearTimeout(relockTimerRef.current);
      relockTimerRef.current = null;
    }
    setIsUnlocked(false);
    clearUnlock();
  }, []);

  // Start the relock timer (call this when modal closes)
  const startRelockTimer = useCallback(() => {
    // Clear any existing timer
    if (relockTimerRef.current) {
      clearTimeout(relockTimerRef.current);
    }

    touchUnlockTimestamp();

    // Set timer to auto-lock after timeout
    relockTimerRef.current = setTimeout(() => {
      setIsUnlocked(false);
      clearUnlock();
      relockTimerRef.current = null;
    }, RELOCK_TIMEOUT_MS);
  }, []);

  // Cancel the relock timer (call this when modal opens again)
  const cancelRelockTimer = useCallback(() => {
    if (relockTimerRef.current) {
      clearTimeout(relockTimerRef.current);
      relockTimerRef.current = null;
    }
  }, []);

  // Check if a specific section is protected
  // Also checks localStorage to ensure we have the latest settings
  const isProtected = useCallback(
    section => {
      const stored = readBiometricSettingsFromStorage();
      const currentSettings = stored ? { ...settings, ...stored } : settings;

      if (!currentSettings.enabled) return false;

      switch (section) {
        case "income":
          return currentSettings.protectIncome;
        case "reports":
          return currentSettings.protectReports;
        case "biometric-settings":
          // Biometric settings are always protected if biometric is enabled
          return true;
        default:
          return false;
      }
    },
    [settings]
  );

  // Check if access is allowed to a section
  const canAccess = useCallback(
    section => {
      // First check if section is even protected
      if (!isProtected(section)) return true;

      if (isUnlockValid()) {
        return true;
      }

      return isUnlocked;
    },
    [isProtected, isUnlocked]
  );

  return {
    settings,
    updateSettings,
    isUnlocked,
    isBiometricAvailable,
    isChecking,
    requestUnlock,
    lock,
    isProtected,
    canAccess,
    startRelockTimer,
    cancelRelockTimer,
  };
}

export default useBiometricLock;