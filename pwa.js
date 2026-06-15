// Registrerar service worker så sidan kan installeras som app på mobilen.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(err => {
      console.warn("Service worker-registrering misslyckades:", err);
    });
  });
}
