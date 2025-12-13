"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Service worker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("[SW] Service worker registration failed:", error);
        });
    }
  }, []);

  return null;
}

export default ServiceWorkerRegistration;
