"use client";

import { useState, useEffect, useCallback } from "react";

// Device-specific keys - each device has its own biometric credential
const BIOMETRIC_CREDENTIAL_KEY = "shop_biometric_credential";
const BIOMETRIC_ENABLED_KEY = "shop_biometric_enabled";
const DEVICE_ID_KEY = "shop_device_id";

/**
 * Generate a unique device ID for this browser/device
 */
function getOrCreateDeviceId() {
  if (typeof window === "undefined") return null;
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    // Generate a unique device ID using crypto
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Hook for managing biometric authentication using WebAuthn
 * Supports Face ID (iOS), Touch ID (iOS/Mac), and Fingerprint (Android)
 * Each device has its own biometric credential (device-specific)
 */
export function useBiometric() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deviceId, setDeviceId] = useState(null);

  // Check if WebAuthn is supported and if biometric is available
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Get or create device ID
        const id = getOrCreateDeviceId();
        setDeviceId(id);
        
        // Check if WebAuthn is available
        if (!window.PublicKeyCredential) {
          setIsSupported(false);
          setIsLoading(false);
          return;
        }

        // Check if platform authenticator (biometric) is available
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsSupported(available);

        // Check if biometric is enabled for THIS device
        const enabled = localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
        const hasCredential = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY) !== null;
        setIsEnabled(enabled && hasCredential);
      } catch (err) {
        console.error("Error checking biometric support:", err);
        setIsSupported(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSupport();
  }, []);

  /**
   * Register biometric credentials for the current device
   * This should be called after successful password authentication
   */
  const registerBiometric = useCallback(async () => {
    if (!isSupported) {
      throw new Error("Biometric authentication is not supported on this device");
    }

    setIsLoading(true);
    setError(null);

    try {
      const currentDeviceId = getOrCreateDeviceId();
      
      // Get challenge from server
      const challengeResponse = await fetch("/api/auth/biometric/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: currentDeviceId }),
      });

      if (!challengeResponse.ok) {
        throw new Error("Failed to get registration challenge");
      }

      const { challenge, userId, rpId, rpName } = await challengeResponse.json();

      // Create credential options for WebAuthn
      const publicKeyCredentialCreationOptions = {
        challenge: base64ToArrayBuffer(challenge),
        rp: {
          name: rpName || "Shop Manager",
          id: rpId || window.location.hostname,
        },
        user: {
          id: base64ToArrayBuffer(userId),
          name: `shop-user-${currentDeviceId?.substring(0, 8) || 'default'}`,
          displayName: "Shop Manager User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Use device's built-in authenticator
          userVerification: "required", // Require biometric/PIN verification
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none", // We don't need attestation for our use case
      };

      // Create the credential
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      // Send credential to server for storage
      const attestationResponse = credential.response;
      const registrationData = {
        credentialId: arrayBufferToBase64(credential.rawId),
        clientDataJSON: arrayBufferToBase64(attestationResponse.clientDataJSON),
        attestationObject: arrayBufferToBase64(attestationResponse.attestationObject),
        deviceId: currentDeviceId,
      };

      const registerResponse = await fetch("/api/auth/biometric/register", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || "Failed to register biometric");
      }

      // Store credential ID locally (device-specific)
      localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, registrationData.credentialId);
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
      setIsEnabled(true);

      return { success: true };
    } catch (err) {
      console.error("Biometric registration error:", err);
      setError(err.message || "Failed to register biometric");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Authenticate using biometrics
   * Returns success status and any auth data needed
   */
  const authenticateWithBiometric = useCallback(async () => {
    if (!isEnabled) {
      throw new Error("Biometric authentication is not enabled");
    }

    setIsLoading(true);
    setError(null);

    try {
      const credentialId = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
      const currentDeviceId = getOrCreateDeviceId();
      
      if (!credentialId) {
        throw new Error("No biometric credential found");
      }

      // Get challenge from server
      const challengeResponse = await fetch("/api/auth/biometric/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId, deviceId: currentDeviceId }),
      });

      if (!challengeResponse.ok) {
        const errorData = await challengeResponse.json();
        // If credential not found on server, clear local storage
        if (challengeResponse.status === 404) {
          localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
          localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
          setIsEnabled(false);
        }
        throw new Error(errorData.error || "Failed to get authentication challenge");
      }

      const { challenge, rpId } = await challengeResponse.json();

      // Create assertion options
      const publicKeyCredentialRequestOptions = {
        challenge: base64ToArrayBuffer(challenge),
        rpId: rpId || window.location.hostname,
        allowCredentials: [
          {
            id: base64ToArrayBuffer(credentialId),
            type: "public-key",
            transports: ["internal"], // Platform authenticator
          },
        ],
        userVerification: "required",
        timeout: 60000,
      };

      // Get the assertion (this triggers biometric prompt)
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      if (!assertion) {
        throw new Error("Biometric authentication was cancelled");
      }

      // Verify assertion with server
      const assertionResponse = assertion.response;
      const authData = {
        credentialId: arrayBufferToBase64(assertion.rawId),
        clientDataJSON: arrayBufferToBase64(assertionResponse.clientDataJSON),
        authenticatorData: arrayBufferToBase64(assertionResponse.authenticatorData),
        signature: arrayBufferToBase64(assertionResponse.signature),
        userHandle: assertionResponse.userHandle
          ? arrayBufferToBase64(assertionResponse.userHandle)
          : null,
        deviceId: currentDeviceId,
      };

      const verifyResponse = await fetch("/api/auth/biometric/authenticate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authData),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || "Biometric verification failed");
      }

      return { success: true };
    } catch (err) {
      console.error("Biometric authentication error:", err);
      
      // Handle specific error cases
      if (err.name === "NotAllowedError") {
        setError("Biometric authentication was cancelled or not allowed");
      } else if (err.name === "SecurityError") {
        setError("Security error during biometric authentication");
      } else {
        setError(err.message || "Biometric authentication failed");
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled]);

  /**
   * Disable biometric authentication for this device
   */
  const disableBiometric = useCallback(async () => {
    try {
      const credentialId = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
      const currentDeviceId = getOrCreateDeviceId();
      
      if (credentialId) {
        // Notify server to remove credential
        await fetch("/api/auth/biometric/register", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credentialId, deviceId: currentDeviceId }),
        });
      }

      // Clear local storage
      localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
      localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(false);

      return { success: true };
    } catch (err) {
      console.error("Error disabling biometric:", err);
      setError(err.message || "Failed to disable biometric");
      throw err;
    }
  }, []);

  return {
    isSupported,
    isEnabled,
    isLoading,
    error,
    deviceId,
    registerBiometric,
    authenticateWithBiometric,
    disableBiometric,
  };
}

// Helper functions for ArrayBuffer/Base64 conversion
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64ToArrayBuffer(base64) {
  // Handle URL-safe base64
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export default useBiometric;
