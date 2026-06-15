// Service worker – PWA + offline-cache av app-shell.
// Firestore har sin egen offline-persistens (aktiveras i app.js).

const VERSION = "v6";
const CACHE = "app-shell-" + VERSION;

// Allt som ska kunna laddas helt utan nät. Versions-querystrings måste matcha exakt.
const SHELL = [
  "/",
  "/butlern.html",
  "/todo.html",
  "/ideer.html",
  "/loggbok.html",
  "/tacksamhet.html",
  "/mindfulness.html",
  "/moon.html",
  "/oracle.html",
  "/lankar.html",
  "/parkering.html",
  "/sommarplanering.html",
  "/styles.css?v=1",
  "/app.js?v=4",
  "/task-list.js?v=5",
  "/auth-gate.js?v=9",
  "/pwa.js?v=1",
  "/icon.svg",
  "/manifest.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(SHELL.map(url =>
        cache.add(url).catch(err => console.warn("[SW] kunde inte cacha", url, err))
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Cross-origin (Firebase CDN, Firestore, Auth): rör inte. Firestore SDK
  // hanterar sin egen offline-kö via IndexedDB.
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get("accept") || "";
  const isHTML = accept.includes("text/html") ||
                 url.pathname.endsWith(".html") ||
                 url.pathname === "/";

  // HTML – stale-while-revalidate: visa cache direkt (snabbt, sparar mobildata),
  // hämta ny version i bakgrunden för nästa besök.
  if (isHTML) {
    e.respondWith(
      caches.match(req).then(cached => {
        const netP = fetch(req).then(resp => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return resp;
        }).catch(() => cached || caches.match("/butlern.html"));
        return cached || netP;
      })
    );
    return;
  }

  // Statiska assets – stale-while-revalidate.
  e.respondWith(
    caches.match(req).then(cached => {
      const netP = fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => cached);
      return cached || netP;
    })
  );
});
