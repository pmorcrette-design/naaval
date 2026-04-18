const CACHE_NAME = "naaval-carrier-v2";
const APP_SHELL = [
  "/carrier/",
  "/carrier/index.html",
  "/carrier/styles.css",
  "/carrier/app.js",
  "/carrier/manifest.webmanifest",
  "/carrier/assets/naaval-carrier-icon-192.png",
  "/carrier/assets/naaval-carrier-icon-512.png",
  "/assets/logo-mark.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isAppShellRequest =
    requestUrl.origin === self.location.origin &&
    (requestUrl.pathname.startsWith("/carrier/") ||
      requestUrl.pathname === "/assets/logo-mark.svg" ||
      requestUrl.pathname === "/ops-config.js");

  if (isAppShellRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      });
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const carrierClient = clients.find((client) => client.url.includes("/carrier/"));
      if (carrierClient) {
        return carrierClient.focus();
      }

      return self.clients.openWindow("/carrier/");
    })
  );
});
