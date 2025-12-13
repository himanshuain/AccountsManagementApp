// Service Worker for Shop Manager PWA
// Handles share target for receiving images from other apps

const CACHE_NAME = "shop-manager-v1";
const SHARED_IMAGES_CACHE = "shared-images";

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(clients.claim());
});

// Fetch event - Handle share target POST requests
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Handle share target
  if (url.pathname === "/share-target" && event.request.method === "POST") {
    event.respondWith(handleShareTarget(event.request));
    return;
  }
});

// Handle share target POST request
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("images");

    console.log("[SW] Received shared files:", files.length);

    if (files.length > 0) {
      // Store files in cache for the page to read
      const cache = await caches.open(SHARED_IMAGES_CACHE);

      // Clear previous shared files
      const keys = await cache.keys();
      for (const key of keys) {
        await cache.delete(key);
      }

      // Store new files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file instanceof File) {
          const response = new Response(file, {
            headers: {
              "Content-Type": file.type,
              "X-File-Name": file.name,
            },
          });
          await cache.put(`/shared-image-${i}`, response);
        }
      }
    }

    // Redirect to share target page
    return Response.redirect("/share-target", 303);
  } catch (error) {
    console.error("[SW] Error handling share target:", error);
    return Response.redirect("/share-target?error=1", 303);
  }
}
