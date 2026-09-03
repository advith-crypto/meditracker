/* MediTracker service worker.
 *
 * Registered as /sw.js?mode=dev|prod so the worker knows which environment
 * it runs in:
 *   - dev:  pure pass-through — nothing is cached, so Vite HMR is untouched.
 *           The worker still counts as a fetch handler, which keeps the app
 *           installable from the preview.
 *   - prod: precache the app shell and serve same-origin assets
 *           stale-while-revalidate, with an offline fallback for navigation.
 * The app works fine without this worker; it only adds offline support and
 * installability.
 */
const MODE = new URL(self.location.href).searchParams.get("mode") || "prod";
const CACHE = "meditracker-v1";
const SHELL = [
  "/",
  "/manifest.webmanifest",
  "/logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  if (MODE !== "prod") {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (MODE !== "prod") return; // dev: let the network handle everything

  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, cached shell as offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put("/", copy))
            .catch(() => {});
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Same-origin assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const update = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches
              .open(CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || update;
    }),
  );
});