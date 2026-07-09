// === Gemensam app-init f\u00f6r alla sidor ===
// Anv\u00e4nds tillsammans med firebase-compat-scripten + auth-gate.js
// Anv\u00e4ndning:
//   <nav data-nav-pills></nav>
//   <script src="app.js?v=1"></script>
//   <script>
//     renderNav("loggbok");                       // markera aktiv sida
//     initApp(db => { /* anv\u00e4nd db h\u00e4r */ }); // f\u00e5r en redan-init firestore-instans
//   </script>

window.firebaseConfig = {
  apiKey: "AIzaSyA4_OLEPJ6ZU8wB9W3Vzslcc7j1m6jLRdc",
  authDomain: "sommarplanering-d4300.firebaseapp.com",
  projectId: "sommarplanering-d4300",
  storageBucket: "sommarplanering-d4300.firebasestorage.app",
  messagingSenderId: "261517602417",
  appId: "1:261517602417:web:11b754c758c92cc33735d0"
};

const NAV_LINKS = [
  { key: "butlern",     href: "butlern.html",     icon: "\ud83d\udcc5",     label: "Planering" },
  { key: "todo",        href: "todo.html",        icon: "\ud83d\udcdd",     label: "Todo" },
  { key: "ideer",       href: "ideer.html",       icon: "\ud83d\udca1",     label: "Id\u00e9er" },
  { key: "inkop",       href: "inkop.html",       icon: "\ud83d\uded2",     label: "Ink\u00f6p" },
  { key: "loggbok",     href: "loggbok.html",     icon: "\ud83d\udcd3",     label: "Logg" },
  { key: "tacksamhet",  href: "tacksamhet.html",  icon: "\ud83d\ude4f",     label: "Tack" },
  { key: "mindfulness", href: "mindfulness.html", icon: "\ud83e\uddd8",     label: "Mindfulness" },
  { key: "kalender",    href: "kalender.html",    icon: "\ud83c\udf3f",     label: "Sj\u00e4lslig sp\u00e4nst" },
  { key: "vader",       href: "vader.html",       icon: "\u26c5",            label: "V\u00e4der" },
  { key: "moon",        href: "moon.html",        icon: "\ud83c\udf19",     label: "The Moon" },
  { key: "oracle2",     href: "oracle2.html",     icon: "\ud83d\udd2e",     label: "Oraklet" },
  { key: "lankar",      href: "lankar.html",      icon: "\ud83d\udd17",     label: "L\u00e4nkar" },
  { key: "parkering",   href: "parkering.html",   icon: "\ud83c\udd7f\ufe0f", label: "Parkering" },
  { key: "tyska",       href: "tyska.html",       icon: "\ud83c\udde9\ud83c\uddea", label: "Tyska" },
  { key: "spanska",     href: "spanska.html",     icon: "\ud83c\uddea\ud83c\uddf8", label: "Spanska" }
];

// Sidor som visas som pills i toppnavigationen (resten n\u00e5s via mer.html)
const PRIMARY_NAV_KEYS = ["butlern", "todo", "ideer", "inkop", "vader", "lankar"];

const MER_LINK = { key: "mer", href: "mer.html", icon: "\u2026", label: "Mer" };

function renderNav(activeKey) {
  const navs = document.querySelectorAll("[data-nav-pills]");
  const primary = NAV_LINKS.filter(l => PRIMARY_NAV_KEYS.includes(l.key));
  const isPrimary = PRIMARY_NAV_KEYS.includes(activeKey);
  const merActive = activeKey === "mer" || (!isPrimary && activeKey !== undefined);
  const pills = [...primary, MER_LINK];

  navs.forEach(nav => {
    nav.classList.add("nav-pills");
    if (!nav.hasAttribute("aria-label")) nav.setAttribute("aria-label", "Sidor");
    nav.innerHTML = pills.map(l => {
      const active = l.key === "mer" ? merActive : l.key === activeKey;
      return active
        ? `<span class="nav-pill active"><span class="ico">${l.icon}</span>${l.label}</span>`
        : `<a class="nav-pill" href="${l.href}"><span class="ico">${l.icon}</span>${l.label}</a>`;
    }).join("");
  });
}

// Delade hjälpare — exponerade globalt så alla sidor kan använda dem.
window.escapeHtml = function(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
};

function initApp(onReady, opts) {
  opts = opts || {};
  let tries = 0;
  const tryInit = () => {
    if (typeof firebase === "undefined") {
      if (++tries > 50) {
        const msg = "Firebase laddades aldrig (CDN blockerad?)";
        if (opts.onError) opts.onError(new Error(msg)); else console.error(msg);
        return;
      }
      return setTimeout(tryInit, 100);
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
    } catch (e) {
      console.error("Firebase init error:", e);
      if (opts.onError) opts.onError(e);
      return;
    }
    const db = firebase.firestore();
    if (opts.memoryCache) {
      try { db.settings({ cache: { kind: "memory" } }); } catch (e) {}
      onReady(db);
    } else {
      // Aktivera offline-persistens (IndexedDB) så appen funkar utan nät.
      // Måste ske före första query. Failar i privat läge eller om annan
      // flik redan håller låset – då fortsätter vi utan persistens.
      db.enablePersistence()
        .catch(err => {
          if (err && err.code === "failed-precondition") {
            console.warn("[Firestore] offline-persistens av (flera flikar öppna)");
          } else if (err && err.code === "unimplemented") {
            console.warn("[Firestore] webbläsaren stödjer inte offline-persistens");
          } else {
            console.warn("[Firestore] persistens-fel:", err);
          }
        })
        .finally(() => onReady(db));
    }
  };
  if (typeof requireAuth === "function") {
    requireAuth(tryInit);
  } else {
    tryInit();
  }
}
