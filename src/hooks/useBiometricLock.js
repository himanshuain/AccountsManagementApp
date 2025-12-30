"use client";

import { useState, useEffect, useCallback } from "react";

const BIOMETRIC_SETTINGS_KEY = "biometric_lock_settings";
const SESSION_UNLOCKED_KEY = "biometric_session_unlocked";

/**
 * Hook for managing biometric lock functionality
 * Uses localStorage for settings and session storage for unlock state
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

  // Check if biometrics is available
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        // Check if PublicKeyCredential is available
        if (window.PublicKeyCredential) {
          // Check if platform authenticator is available (fingerprint, face ID, etc.)
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
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

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BIOMETRIC_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
      
      // Check if session is already unlocked
      const sessionUnlocked = sessionStorage.getItem(SESSION_UNLOCKED_KEY);
      if (sessionUnlocked === "true") {
        setIsUnlocked(true);
      }
    } catch (error) {
      console.error("Error loading biometric settings:", error);
    }
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings) => {
    try {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      localStorage.setItem(BIOMETRIC_SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error saving biometric settings:", error);
    }
  }, [settings]);

  // Request biometric authentication
  const requestUnlock = useCallback(async () => {
    if (!settings.enabled || !isBiometricAvailable) {
      setIsUnlocked(true);
      return { success: true };
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
          setIsUnlocked(true);
          sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");
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
            { type: "public-key", alg: -7 },  // ES256
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
        setIsUnlocked(true);
        sessionStorage.setItem(SESSION_UNLOCKED_KEY, "true");
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
  }, [settings.enabled, isBiometricAvailable]);

  // Lock the session
  const lock = useCallback(() => {
    setIsUnlocked(false);
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
  }, []);

  // Check if a specific section is protected
  const isProtected = useCallback((section) => {
    if (!settings.enabled) return false;
    
    switch (section) {
      case "income":
        return settings.protectIncome;
      case "reports":
        return settings.protectReports;
      default:
        return false;
    }
  }, [settings]);

  // Check if access is allowed to a section
  const canAccess = useCallback((section) => {
    if (!isProtected(section)) return true;
    return isUnlocked;
  }, [isProtected, isUnlocked]);

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
  };
}

export default useBiometricLock;

