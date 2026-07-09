// Service worker – PWA + offline-cache av app-shell.
// Firestore har sin egen offline-persistens (aktiveras i app.js).

const VERSION = "v21";
const CACHE = "app-shell-" + VERSION;

// Allt som ska kunna laddas helt utan nät. Versions-querystrings måste matcha exakt.
const SHELL = [
  "/",
  "/butlern.html",
  "/todo.html",
  "/ideer.html",
  "/inkop.html",
  "/loggbok.html",
  "/tacksamhet.html",
  "/mindfulness.html",
  "/kalender.html",
  "/vader.html",
  "/moon.html",
  "/oracle2.html",
  "/lankar.html",
  "/parkering.html",
  "/tyska.html",
  "/spanska.html",
  "/mer.html",
  "/sommarplanering.html",
  "/styles.css?v=1",
  "/app.js?v=7",
  "/task-list.js?v=10",
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
    ).then(() => self.clients.claim()).then(() =>
      self.clients.matchAll({ type: "window" }).then(clients => {
        clients.forEach(c => c.postMessage({ type: "SW_UPDATED", version: VERSION }));
      })
    )
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

  // HTML – network-first: färskt innehåll när online, cache bara som offline-fallback.
  if (isHTML) {
    e.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() =>
        caches.match(req).then(cached => cached || caches.match("/butlern.html"))
      )
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
