"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

/**
 * Hook to use the Contact Picker API for selecting contacts on supported devices (Android PWA)
 * Falls back gracefully on unsupported devices
 */
export function useContactPicker() {
  // Initialize as false to avoid hydration mismatch, check on mount
  const [isSupported, setIsSupported] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  // Check support on mount (client-side only)
  useEffect(() => {
    const supported = "contacts" in navigator && "ContactsManager" in window;
    setIsSupported(supported);
  }, []);

  const pickContact = useCallback(async () => {
    if (!isSupported) {
      toast.error("Contact picker is not supported on this device");
      return null;
    }

    setIsPicking(true);
    try {
      // Request contact with phone number
      const props = ["tel", "name"];
      const opts = { multiple: false };

      const contacts = await navigator.contacts.select(props, opts);

      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const phone = contact.tel && contact.tel.length > 0 ? contact.tel[0] : null;
        const name = contact.name && contact.name.length > 0 ? contact.name[0] : null;

        // Clean phone number - remove spaces, dashes, country codes
        let cleanedPhone = phone;
        if (phone) {
          cleanedPhone = phone.replace(/[\s\-\(\)]/g, "");
          // Remove country code if present (+91)
          if (cleanedPhone.startsWith("+91")) {
            cleanedPhone = cleanedPhone.substring(3);
          } else if (cleanedPhone.startsWith("91") && cleanedPhone.length > 10) {
            cleanedPhone = cleanedPhone.substring(2);
          }
          // Keep only last 10 digits if longer
          if (cleanedPhone.length > 10) {
            cleanedPhone = cleanedPhone.slice(-10);
          }
        }

        return {
          name,
          phone: cleanedPhone,
          rawPhone: phone,
        };
      }

      return null;
    } catch (error) {
      if (error.name !== "InvalidStateError" && error.name !== "AbortError") {
        console.error("Contact picker error:", error);
        toast.error("Failed to access contacts");
      }
      return null;
    } finally {
      setIsPicking(false);
    }
  }, [isSupported]);

  // Check if API is available on mount (client-side only)
  const checkSupport = useCallback(() => {
    if (typeof window !== "undefined") {
      const supported = "contacts" in navigator && "ContactsManager" in window;
      setIsSupported(supported);
      return supported;
    }
    return false;
  }, []);

  return {
    isSupported,
    isPicking,
    pickContact,
    checkSupport,
  };
}

export default useContactPicker;
