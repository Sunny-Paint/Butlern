/* Auth-gate: kräver Google-inloggning från godkänd e-postadress.
   Sidan måste:
   1. Ladda firebase-app, firebase-auth, firebase-firestore (compat) FÖRE detta skript
   2. Sätta window.firebaseConfig = {...}
   3. Anropa requireAuth(initFn) — initFn körs först när inloggad användare är godkänd
*/
(function(){
  const ALLOWED_EMAILS = [
    "sanoriah@gmail.com"
    // Lägg till fler här: , "annan@example.com"
  ];

  let onReadyCallback = null;
  let started = false;

  function injectStyles() {
    if (document.getElementById("auth-gate-style")) return;
    const s = document.createElement("style");
    s.id = "auth-gate-style";
    s.textContent = `
      #auth-overlay{
        position:fixed;inset:0;z-index:9999;
        background:linear-gradient(180deg,#1a1238,#2a1a4a);
        display:none;align-items:center;justify-content:center;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
        color:#f0eaff;padding:20px;
      }
      #auth-overlay.open{display:flex}
      #auth-overlay .auth-card{
        background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.12);
        border-radius:16px;
        padding:32px 28px;
        max-width:380px;width:100%;
        text-align:center;
        box-shadow:0 8px 32px rgba(0,0,0,.4);
      }
      #auth-overlay h2{margin:0 0 8px;font-size:22px;font-weight:600}
      #auth-overlay p{margin:0 0 20px;color:#c0b8e0;font-size:14px;line-height:1.5}
      #auth-overlay button{
        background:#fff;color:#1a1238;
        border:none;border-radius:10px;
        padding:12px 20px;font-size:14px;font-weight:600;
        cursor:pointer;display:inline-flex;align-items:center;gap:10px;
        font-family:inherit;
      }
      #auth-overlay button:hover{background:#e8e4ff}
      #auth-overlay .auth-error{color:#ffb0b0;font-size:13px;margin-top:14px;min-height:18px}
      #auth-logout{
        position:fixed;top:8px;right:8px;z-index:50;
        background:rgba(0,0,0,.15);color:inherit;
        border:1px solid rgba(0,0,0,.15);
        border-radius:6px;padding:4px 10px;
        font-size:12px;cursor:pointer;font-family:inherit;
        display:none;
      }
      #auth-logout.show{display:inline-block}
      #auth-logout:hover{background:rgba(0,0,0,.3)}
    `;
    document.head.appendChild(s);
  }

  function injectOverlay() {
    if (document.getElementById("auth-overlay")) return;
    const div = document.createElement("div");
    div.id = "auth-overlay";
    div.innerHTML = `
      <div class="auth-card">
        <h2>🔒 Privat</h2>
        <p>Logga in med ditt Google-konto för att se dina anteckningar.</p>
        <button type="button" id="auth-google-btn">
          <span style="font-size:18px">🔑</span> Logga in med Google
        </button>
        <div class="auth-error" id="auth-error"></div>
      </div>
    `;
    document.body.appendChild(div);
    document.getElementById("auth-google-btn").addEventListener("click", signIn);

    const logoutBtn = document.createElement("button");
    logoutBtn.id = "auth-logout";
    logoutBtn.textContent = "Logga ut";
    logoutBtn.addEventListener("click", () => firebase.auth().signOut());
    document.body.appendChild(logoutBtn);
  }

  function showLogin(err) {
    document.getElementById("auth-overlay").classList.add("open");
    document.getElementById("auth-logout").classList.remove("show");
    document.getElementById("auth-error").textContent = err || "";
    document.body.style.overflow = "hidden";
  }

  function hideLogin() {
    document.getElementById("auth-overlay").classList.remove("open");
    document.getElementById("auth-logout").classList.add("show");
    document.body.style.overflow = "";
  }

  function signIn() {
    if (location.protocol === "file:") {
      document.getElementById("auth-error").innerHTML =
        'Öppna sidan via <a href="https://sommarplanering-d4300.web.app" style="color:#fff;text-decoration:underline">sommarplanering-d4300.web.app</a> i stället för från disk.';
      return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err => {
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
        firebase.auth().signInWithRedirect(provider).catch(e2 => {
          document.getElementById("auth-error").textContent = "Fel: " + e2.message;
        });
        return;
      }
      document.getElementById("auth-error").textContent = "Fel: " + err.message;
    });
  }

  function start() {
    if (typeof firebase === "undefined" || !firebase.auth) {
      return setTimeout(start, 100);
    }
    if (!window.firebaseConfig) {
      console.error("auth-gate: window.firebaseConfig saknas");
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);

    injectStyles();
    injectOverlay();

    firebase.auth().onAuthStateChanged(user => {
      if (!user) { showLogin(); return; }
      if (!ALLOWED_EMAILS.includes(user.email)) {
        firebase.auth().signOut();
        showLogin("Kontot " + user.email + " har inte åtkomst.");
        return;
      }
      hideLogin();
      if (onReadyCallback && !started) {
        started = true;
        try { onReadyCallback(user); } catch(e) { console.error(e); }
      }
    });
  }

  window.requireAuth = function(cb) {
    onReadyCallback = cb;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  };
})();
