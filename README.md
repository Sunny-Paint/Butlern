# ☀ Familjeplanering — Sommar 2026

En liten samling sidor för familjens sommar, dagbok och tacksamhet. Allt körs som statisk HTML på Firebase Hosting och sparar i Firestore.

**🌐 Live:** https://sommarplanering-d4300.web.app
**Alt-domän:** https://sommarplanering-d4300.firebaseapp.com

---

## Sidor

| URL | Fil | Vad |
|---|---|---|
| `/` | `sommarplanering.html` | Kalender juni–aug 2026, semestrar, att-göra per månad |
| `/dagbok.html` | `dagbok.html` | Personlig dagbok: humör, energi, tankar, idéer, mood-kurva |
| `/tacksamhet.html` | `tacksamhet.html` | Tacksamhetsdagbok: Tack / Bra / Hjälp |
| `/dagbok-v1.html` | `dagbok-v1.html` | Backup av första dagboksversionen (läser samma data) |

Navigation mellan sidorna finns i undertiteln på varje sida.

---

## Funktioner per sida

### 📅 Kalender (`sommarplanering.html`)
- Tre månader (juni, juli, augusti 2026) i kortvy
- Personer: Johan, Sanna, Eira, Elian, Alla — välj en eller flera
- Datumintervall, valfri symbol (☀️🏖️✈️…) och färg
- Helgdagar markerade (nationaldagen, midsommar)
- "Idag" markeras gult
- Redigera (✎) och ta bort (x) per post
- **Att-göra-lista per månad** med prio (Hög/Mellan/Låg), tilldelning, symbol, kommentar
- "Återställ startposter" rensar allt och seedar in standardposter
- ⚠️ Cachar i `localStorage` (snabb start, fungerar offline) — *innehåller ingen privat data*

### 📓 Dagbok (`dagbok.html`)
- **Datum + tid** — kan skriva flera gånger per dag
- **Humör** 1–5 (😞😕😐🙂😄)
- **Energi** 1–10 (slider)
- **Tankar** (textfält)
- **Roliga idéer** (textfält)
- **Anteckning** (textfält)
- **Taggar** (kommaseparerade)
- **Mood-kurva** (SVG): visar humör över tid, period 7/14/30/90/alla dagar
- Redigera/ta bort per post
- 🔒 **Ingen lokal lagring** — allt går direkt till molnet

### 🙏 Tacksamhet (`tacksamhet.html`)
- En post per datum med tre sektioner:
  - **🙏 Tack** — vad är du tacksam för
  - **🌿 Bra** — vad var bra idag
  - **🤝 Hjälp** — vem hjälpte dig / vem hjälpte du
- Minst en av de tre måste fyllas i
- Sorterad efter datum, nyast först
- Redigera/ta bort per post
- 🔒 **Ingen lokal lagring**

### 📓 Dagbok v1 (`dagbok-v1.html`)
- Backup av första versionen (innehöll sömn-fält)
- Läser och skriver till samma `dagbok`-collection — använd helst bara för att läsa gamla poster

---

## Teknisk stack

- **Frontend:** Ren HTML/CSS/JS, ett enda dokument per sida, inga byggsteg
- **SDK:** Firebase 10.12.0 (compat) från Googles CDN
- **Databas:** Cloud Firestore (projekt `sommarplanering-d4300`)
- **Hosting:** Firebase Hosting

### Firestore-collections

| Collection | Används av | Exempel-fält |
|---|---|---|
| `semester` | Kalendern | `persons[]`, `start`, `end`, `type`, `color`, `symbol` |
| `todos` | Kalenderns att-göra | `month`, `text`, `prio`, `assignee`, `symbol`, `comment`, `done`, `createdAt` |
| `dagbok` | Dagboken (ny + v1) | `date`, `when`, `mood`, `energy`, `tags`, `thoughts`, `ideas`, `note`, `createdAt`, `updatedAt` |
| `tacksamhet` | Tacksamhetssidan | `date`, `tack`, `bra`, `hjalp`, `createdAt`, `updatedAt` |

### Firestore-regler

Just nu är databasen **öppen** (`allow read, write: if true;`). Det betyder att vem som helst som hittar projekt-ID:t teoretiskt kan läsa/skriva. För familjebruk på en okänd URL går det bra — men om sidan delas brett bör reglerna skärpas (auth + ägare per dokument).

---

## Filer i repot

```
c:\GIT\Appar\
├── sommarplanering.html      # Kalender
├── dagbok.html               # Dagbok (ny, ingen localStorage)
├── dagbok-v1.html            # Dagbok (backup, gammal version)
├── tacksamhet.html           # Tacksamhetsdagbok
├── firebase.json             # Hosting-config
├── .firebaserc               # Projekt-bindning
└── README.md                 # Den här filen
```

---

## Driftkommandon

Alla körs från `c:\GIT\Appar` i PowerShell.

```powershell
# Deploya ändringar (efter att du har editerat HTML)
firebase deploy --only hosting

# Förhandsgranska lokalt på http://localhost:5000
firebase serve --only hosting

# Logga in på Firebase CLI (gjort en gång per dator)
firebase login --no-localhost

# Kolla version
firebase --version
```

Inloggat konto: `sanoriah@gmail.com`

---

## Datasäkerhet & privatliv

- **Dagbok + Tacksamhet** sparar **inget på den lokala datorn**. All data går till Firestore i molnet.
- **Kalendern** cachar semester- och att-göra-poster i webbläsarens `localStorage` för snabb laddning. Inga privata anteckningar finns där.
- Firebase API-nycklar i HTML är **inte hemligheter** — säkerhet styrs av Firestore-reglerna.

---

## Snabbstart från ny enhet (t.ex. mobilen)

1. Öppna https://sommarplanering-d4300.web.app i webbläsaren
2. Lägg till på hemskärmen (Safari: dela → "Lägg till på hemskärmen". Chrome: meny → "Lägg till på startskärmen")
3. Ikonen funkar som en app — öppnar direkt utan webbläsarens adressfält

---

## Att göra / framtida förbättringar

- [ ] Skärpa Firestore-reglerna (Google-inloggning + ägare per dokument)
- [ ] Ta bort `localStorage`-cache från kalendern om även semesterdata ska vara molnsynligt enbart
- [ ] Export av dagboken (JSON eller PDF)
- [ ] Stöd för bilagor (bilder) i tacksamhetsposter
- [ ] PWA-manifest så ikonen på hemskärmen blir snyggare
