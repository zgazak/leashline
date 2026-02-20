const DYNAMIC_CACHE = "leashline-dynamic-v__APP_VERSION__";
const STATIC_CACHE = "leashline-static-v__APP_VERSION__";
const PRECACHE_URLS = ["/", "/manifest.json"];

// Install: pre-cache essential resources. Do NOT skipWaiting — controlled updates only.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// Activate: clean old caches, claim clients, broadcast activation.
self.addEventListener("activate", (event) => {
  const currentCaches = new Set([DYNAMIC_CACHE, STATIC_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !currentCaches.has(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
      .then(() =>
        self.clients
          .matchAll({ type: "window" })
          .then((clients) =>
            clients.forEach((client) =>
              client.postMessage({ type: "SW_ACTIVATED" })
            )
          )
      )
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Leashline", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.alertId || "leashline-alert",
    renotify: true,
    data: { url: "/" },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Leashline", options)
  );
});

// Notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});

// Message handler: controlled update trigger
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch strategies
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Network-only for API, SSE, and non-GET
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/stream") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Network-first for HTML navigations, cache fallback for offline
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches
            .open(DYNAMIC_CACHE)
            .then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images), network fallback
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
    )
  );
});
