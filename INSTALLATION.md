# RecruitOS – Installationsanleitung

Dieses System läuft vollständig auf GitHub, ohne separaten Server oder Datenbank.
Alle persönlichen Daten werden **AES-256** verschlüsselt, bevor sie gespeichert werden.

---

## Architektur-Übersicht

```
Browser (React App)
   │
   ├── Google Login  →  Firebase Authentication (nur Identität, kostenlos)
   │
   ├── Daten lesen/schreiben  →  GitHub API  →  Privates Repo (verschlüsselte JSON-Dateien)
   │
   └── Datei-Uploads  →  Google Drive API
```

---

## Voraussetzungen

- **GitHub-Konto** (kostenlos)
- **Google-Konto** (für Firebase + Drive)
- **Node.js** (Version 18 oder höher) → https://nodejs.org
- **Git** → https://git-scm.com

---

## Schritt 1 – Zwei GitHub-Repositories anlegen

Sie brauchen **zwei** Repositories:

### 1a. App-Repository (öffentlich oder privat)
Hier liegt der Code. GitHub Pages deployed hieraus die Website.

1. Gehen Sie zu https://github.com/new
2. Name: `recruit-os` (oder nach Wunsch)
3. Sichtbarkeit: Public *(GitHub Pages ist bei Public-Repos kostenlos)*
4. **Create repository** klicken

### 1b. Daten-Repository (unbedingt privat!)
Hier werden die verschlüsselten Bewerberdaten gespeichert.

1. Gehen Sie erneut zu https://github.com/new
2. Name: `recruit-os-data`
3. Sichtbarkeit: **Private** ← wichtig!
4. ✅ „Add a README file" ankreuzen (damit das Repo nicht leer ist)
5. **Create repository** klicken

---

## Schritt 2 – Firebase-Projekt anlegen (Google Login)

1. Gehen Sie zu https://console.firebase.google.com
2. **„Projekt hinzufügen"** → Name: `recruit-os` → Fortfahren
3. Google Analytics: kann deaktiviert werden → **Projekt erstellen**

### Authentication aktivieren
1. Im linken Menü: **Build → Authentication**
2. **„Jetzt loslegen"**
3. Tab **„Sign-in method"** → **Google** → Aktivieren
4. Ihre E-Mail-Adresse als Projektadresse eingeben → **Speichern**

### Authorized Domain hinzufügen (nach dem ersten Deploy)
1. Authentication → **Settings** → **Authorized domains**
2. **„Domain hinzufügen"** → `IHR-USERNAME.github.io` eingeben

### Firebase-Konfiguration notieren
1. Zahnrad oben links → **Projekteinstellungen**
2. Scrollen zu „Ihre Apps" → **`</>`** (Web-App) klicken
3. App-Namen eingeben → **Registrieren**
4. Die angezeigten Werte notieren:

```
apiKey:        AIza...
authDomain:    recruit-os-12345.firebaseapp.com
projectId:     recruit-os-12345
```

---

## Schritt 3 – GitHub Personal Access Token erstellen

Dieser Token erlaubt der App, Daten in Ihr privates Repo zu schreiben.

1. Gehen Sie zu https://github.com/settings/tokens/new
2. **Note:** `RecruitOS Data Access`
3. **Expiration:** 90 days (oder „No expiration" nach Wunsch)
4. **Scopes:** nur **`repo`** ankreuzen (voller Zugriff auf private Repos)
5. **Generate token** → Den Token **sofort kopieren** (wird nur einmal angezeigt!)

---

## Schritt 4 – Encryption Secret festlegen

Das ist das Master-Passwort für die AES-256-Verschlüsselung aller Bewerberdaten.

- Erstellen Sie ein sicheres, langes Passwort, z. B. mit https://1password.com/password-generator/
- Mindestens 32 Zeichen empfohlen
- **Notieren Sie es sicher** – ohne dieses Secret sind die Daten nicht mehr lesbar!

Beispiel: `mX7#kP9$qR2@wN5!vB8^jL3&hD6*cA1`

---

## Schritt 5 – GitHub Secrets konfigurieren

Secrets werden bei jedem Build als Umgebungsvariablen eingebunden.

1. Gehen Sie zu Ihrem **App-Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Für jeden der folgenden Einträge: **„New repository secret"** klicken

| Secret Name               | Wert (Beispiel)                          | Woher?              |
|---------------------------|------------------------------------------|---------------------|
| `VITE_FIREBASE_API_KEY`   | `AIzaSyB...`                             | Firebase-Konsole    |
| `VITE_FIREBASE_AUTH_DOMAIN` | `recruit-os-12345.firebaseapp.com`     | Firebase-Konsole    |
| `VITE_FIREBASE_PROJECT_ID` | `recruit-os-12345`                      | Firebase-Konsole    |
| `VITE_GITHUB_OWNER`       | `ihr-github-username`                    | Ihr GitHub-Profil   |
| `VITE_GITHUB_REPO`        | `recruit-os-data`                        | Name des Daten-Repos|
| `VITE_GITHUB_TOKEN`       | `ghp_xxxxxxxxxxxx`                       | Schritt 3           |
| `VITE_ENCRYPTION_SECRET`  | `mX7#kP9$qR2@wN5!...`                   | Schritt 4           |

---

## Schritt 6 – Code hochladen

Öffnen Sie ein Terminal und führen Sie folgende Befehle aus:

```bash
# Code herunterladen (die ZIP-Datei aus diesem Chat entpacken)
# Oder: direkt in den entpackten Ordner navigieren

cd recruit-os

# Git initialisieren
git init
git add .
git commit -m "Initial commit: RecruitOS"

# Mit Ihrem GitHub-Repo verbinden (URL anpassen!)
git remote add origin https://github.com/IHR-USERNAME/recruit-os.git

# Code hochladen
git branch -M main
git push -u origin main
```

---

## Schritt 7 – GitHub Pages aktivieren

1. Gehen Sie zu Ihrem App-Repo → **Settings** → **Pages**
2. **Source:** `Deploy from a branch`
3. **Branch:** `gh-pages` → `/ (root)`
4. **Save**

Der erste Deploy startet automatisch (via GitHub Actions) sobald Sie den Code gepusht haben.
Fortschritt unter: `Ihrem Repo → Actions`

---

## Schritt 8 – vite.config.js anpassen

Öffnen Sie `vite.config.js` und ändern Sie den `base`-Pfad auf Ihren Repo-Namen:

```js
// vite.config.js
export default defineConfig({
  plugins: [react()],
  base: '/recruit-os/',   // ← Ihren tatsächlichen Repo-Namen einsetzen
})
```

Dann committen und pushen:

```bash
git add vite.config.js
git commit -m "fix: set correct base path"
git push
```

---

## Schritt 9 – Fertig! App aufrufen

Nach ca. 2 Minuten ist die App erreichbar unter:

```
https://IHR-USERNAME.github.io/recruit-os/
```

---

## Fehlerbehebung

| Problem | Lösung |
|---|---|
| Login-Fehler „auth/unauthorized-domain" | Firebase → Authentication → Settings → Domain `IHR-USERNAME.github.io` hinzufügen |
| Seite zeigt 404 | `base` in `vite.config.js` prüfen – muss mit Repo-Namen übereinstimmen |
| Daten werden nicht gespeichert | GitHub Token prüfen (Scope `repo`?) · Token abgelaufen? |
| Daten nicht lesbar nach Token-Wechsel | Encryption Secret darf sich **nie** ändern – sonst Daten unlesbar |
| Actions schlägt fehl | Repo → Actions → Log lesen; alle 7 Secrets korrekt gesetzt? |

---

## Sicherheitshinweise

- Das **Daten-Repo** (`recruit-os-data`) muss immer **privat** bleiben
- Das **Encryption Secret** niemals in Code einchecken – nur als GitHub Secret
- GitHub Token regelmäßig erneuern (alle 90 Tage empfohlen)
- Bei Personalwechsel: Token sofort widerrufen unter https://github.com/settings/tokens

---

## Datei-Uploads (Google Drive)

Für CV-Uploads und Fotos wird Google Drive empfohlen:

1. Google Cloud Console → https://console.cloud.google.com
2. Neues Projekt → **Google Drive API** aktivieren
3. **OAuth 2.0 Credentials** erstellen
4. Client-ID als weiteres Secret `VITE_GOOGLE_DRIVE_CLIENT_ID` eintragen

*(Die Drive-Integration ist im Code als Platzhalter vorbereitet)*

---

## Updates einspielen

Zukünftige Code-Änderungen werden automatisch deployed:

```bash
# Änderungen vornehmen, dann:
git add .
git commit -m "Beschreibung der Änderung"
git push
# → GitHub Actions baut und deployed automatisch
```
