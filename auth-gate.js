/* Auth-gate: kräver inloggning med tillåten e-post + lösenord. */
(function(){
  const ALLOWED_EMAILS = [
    "sanoriah@gmail.com",
    "sanna.hagenas@gmail.com"
  ];

  let onReadyCallback = null;
  let started = false;

  function injectStyles() {
    if (document.getElementById("auth-gate-style")) return;
    const s = document.createElement("style");
    s.id = "auth-gate-style";
    s.textContent = `
      #auth-overlay{position:fixed;inset:0;z-index:9999;background:linear-gradient(180deg,#1a1238,#2a1a4a);display:none;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#f0eaff;padding:20px}
      #auth-overlay.open{display:flex}
      #auth-overlay .auth-card{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:28px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.4)}
      #auth-overlay h2{margin:0 0 8px;font-size:22px;font-weight:600}
      #auth-overlay p{margin:0 0 18px;color:#c0b8e0;font-size:14px;line-height:1.5}
      #auth-overlay input{width:100%;box-sizing:border-box;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:10px 12px;margin:6px 0;font-size:14px;font-family:inherit}
      #auth-overlay input:focus{outline:none;border-color:#a89fff}
      #auth-overlay button{width:100%;background:#fff;color:#1a1238;border:none;border-radius:10px;padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:10px}
      #auth-overlay button:hover{background:#e8e4ff}
      #auth-overlay button.secondary{background:transparent;color:#c0b8e0;border:1px solid rgba(255,255,255,.2);font-weight:500;margin-top:6px}
      #auth-overlay button.secondary:hover{background:rgba(255,255,255,.05)}
      #auth-overlay .auth-error{color:#ffb0b0;font-size:13px;margin-top:12px;min-height:18px}
      #auth-overlay .auth-info{color:#a8e0a8;font-size:13px;margin-top:12px;min-height:18px}
      #auth-logout{position:fixed;top:8px;right:8px;z-index:50;background:rgba(0,0,0,.15);color:inherit;border:1px solid rgba(0,0,0,.15);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit;display:none}
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
        <p>Logga in för att se dina anteckningar.</p>
        <form id="auth-form" autocomplete="on">
          <input type="email" id="auth-email" placeholder="E-post" autocomplete="username" required>
          <input type="password" id="auth-pw" placeholder="Lösenord" autocomplete="current-password" required>
          <button type="submit" id="auth-submit">Logga in</button>
          <button type="button" id="auth-signup" class="secondary">Skapa konto (första gången)</button>
          <button type="button" id="auth-reset" class="secondary">Glömt lösenord?</button>
        </form>
        <div class="auth-error" id="auth-error"></div>
        <div class="auth-info" id="auth-info"></div>
      </div>
    `;
    document.body.appendChild(div);
    document.getElementById("auth-form").addEventListener("submit", signIn);
    document.getElementById("auth-signup").addEventListener("click", signUp);
    document.getElementById("auth-reset").addEventListener("click", resetPassword);

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
    document.getElementById("auth-info").textContent = "";
    document.body.style.overflow = "hidden";
  }

  function hideLogin() {
    document.getElementById("auth-overlay").classList.remove("open");
    document.getElementById("auth-logout").classList.add("show");
    document.body.style.overflow = "";
  }

  function showError(msg) {
    document.getElementById("auth-error").textContent = msg;
    document.getElementById("auth-info").textContent = "";
  }
  function showInfo(msg) {
    document.getElementById("auth-info").textContent = msg;
    document.getElementById("auth-error").textContent = "";
  }

  function getCreds() {
    return {
      email: document.getElementById("auth-email").value.trim().toLowerCase(),
      password: document.getElementById("auth-pw").value
    };
  }

  function signIn(e) {
    if (e) e.preventDefault();
    const { email, password } = getCreds();
    if (!email || !password) { showError("Fyll i e-post och lösenord."); return; }
    if (!ALLOWED_EMAILS.includes(email)) { showError("Denna e-post har inte åtkomst."); return; }
    firebase.auth().signInWithEmailAndPassword(email, password)
      .catch(err => showError("Inloggning misslyckades: " + (err.message || err.code)));
  }

  function signUp() {
    const { email, password } = getCreds();
    if (!email || !password) { showError("Fyll i e-post och lösenord (minst 6 tecken)."); return; }
    if (!ALLOWED_EMAILS.includes(email)) { showError("Denna e-post har inte åtkomst."); return; }
    if (password.length < 6) { showError("Lösenordet måste vara minst 6 tecken."); return; }
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .then(() => showInfo("Konto skapat — du loggas in automatiskt."))
      .catch(err => showError("Kunde inte skapa konto: " + (err.message || err.code)));
  }

  function resetPassword() {
    const { email } = getCreds();
    if (!email) { showError("Fyll i din e-post först."); return; }
    if (!ALLOWED_EMAILS.includes(email)) { showError("Denna e-post har inte åtkomst."); return; }
    firebase.auth().sendPasswordResetEmail(email)
      .then(() => showInfo("Återställningslänk skickad till " + email))
      .catch(err => showError("Fel: " + (err.message || err.code)));
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
      if (!ALLOWED_EMAILS.includes((user.email || "").toLowerCase())) {
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
