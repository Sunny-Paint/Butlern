// Registrerar service worker så sidan kan installeras som app på mobilen.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(err => {
      console.warn("Service worker-registrering misslyckades:", err);
    });
  });

  // Ladda om sidan automatiskt när en ny service worker-version aktiveras,
  // så att man ser nya funktioner utan att behöva reloada manuellt.
  let reloaded = false;
  navigator.serviceWorker.addEventListener("message", ev => {
    if (ev.data && ev.data.type === "SW_UPDATED" && !reloaded) {
      reloaded = true;
      window.location.reload();
    }
  });
}
