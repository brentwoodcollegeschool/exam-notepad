// IMPORTANT: bump this on every deploy that changes any file in ASSETS.
// Each version's files are cached together atomically on install, so a
// stale/mismatched mix of old-JS-with-new-HTML (the exact bug this app hit
// once already) can't happen — offline visitors always get one coherent,
// complete snapshot, never a partial mix of two different deploys.
const CACHE_NAME = "exam-notepad-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first, so anyone online always gets the current deploy. Only when
// the network genuinely fails do we fall back to the cache — and that
// fallback is always this version's own untouched install-time snapshot
// (we never write network responses back into it), so it can't drift into
// a mismatched combination of files from different deploys.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.open(CACHE_NAME).then((cache) => cache.match(event.request)))
  );
});
