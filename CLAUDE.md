# CLAUDE.md

Guidance for Claude Code (or any Claude session) working in this repository.

## What this is

**RecruitOS** — a single-user Applicant Tracking System (ATS). It tracks job postings, candidates, interviews, and an archive of closed positions, with resume upload + AI-assisted data extraction.

Design goal (from the project brief): the whole system runs **entirely on GitHub with no separate backend/database**, and **all personal data is encrypted** before it's ever written to storage.

## Architecture

There is no server. The app is a static React SPA hosted on GitHub Pages that talks directly to two external APIs from the browser:

```
Browser (React SPA)
  ├─ Google Sign-In  → Firebase Authentication (identity only — one allowlisted email)
  ├─ Read/write data → GitHub Contents API → a PRIVATE "data" repo (AES-256-GCM encrypted JSON blobs)
  └─ Resume uploads  → same private data repo, under data/resumes/ (also encrypted)
```

- **Two GitHub repos are involved**: this app repo (code, deployed via Pages) and a separate **private** data repo (e.g. `recruit-os-data`) that holds only encrypted files. Never assume they're the same repo.
- **No database.** Every "collection" (`jobs`, `candidates`, `interviews`, `archives`, `notes`) is a single encrypted JSON file (`<name>.enc`) in the data repo, read/written wholesale via the GitHub Contents API (`src/lib/github-storage.js`). There's no partial update — `saveCollection` overwrites the whole file each time.
- **Auth is a single-user allowlist**, not multi-tenant. `src/lib/auth.js` signs the user out immediately if their Google email doesn't match `VITE_ALLOWED_EMAIL`. Don't build multi-user assumptions into new features unless asked.
- **Client-side encryption only.** `src/lib/crypto.js` derives an AES-256-GCM key via PBKDF2 (100k iterations) from `VITE_ENCRYPTION_SECRET`, salted with a fixed string (`'recruit-os-v1'`). Encryption/decryption happens in the browser before anything touches the GitHub API.

### Known architectural trade-off (be aware, don't "fix" silently)

All `VITE_*` env vars — including `VITE_GITHUB_TOKEN` (a PAT with `repo` scope) and `VITE_ENCRYPTION_SECRET` — are inlined into the built JS bundle by Vite, because there is no server to keep them secret. Security here rests entirely on the **data repo being private** and the **app repo/bundle not being exposed to untrusted parties**. If you touch auth, storage, or build config, preserve this model rather than "helpfully" moving secrets somewhere that assumes a backend exists — there isn't one. If asked to harden this, flag the trade-off explicitly rather than changing it silently.

## Tech stack

- React 18 + Vite 5 (no TypeScript, no React Router — views are switched via `useState` in `src/App.jsx`)
- Firebase Auth (`firebase` SDK) — Google Sign-In only
- `pdfjs-dist` + `mammoth` — client-side PDF/DOCX text extraction from uploaded resumes
- AI features (resume field extraction, interview questions, text improvement) call out via `src/lib/ai.js`, backed by OpenRouter (`VITE_OPENROUTER_API_KEY`)
- Plain CSS (`src/index.css`, utility-style classes like `.btn`, `.field`, `.table`, `.badge`) + inline styles in components — no CSS framework
- i18n: hand-rolled DE/EN dictionary in `src/lib/i18n.jsx` via a `useT()` hook; German is the primary/default language, English is the secondary

## Key files

| File | Purpose |
|---|---|
| `src/App.jsx` | App shell: auth gate, collection loading, view routing, persist helpers |
| `src/lib/auth.js` | Firebase init + Google login + `VITE_ALLOWED_EMAIL` allowlist check |
| `src/lib/crypto.js` | AES-256-GCM encrypt/decrypt (PBKDF2 key derivation) |
| `src/lib/github-storage.js` | CRUD for `jobs`/`candidates`/`interviews`/`archives`/`notes` via GitHub Contents API |
| `src/lib/resume.js` | Encrypted resume upload/download/delete + PDF/DOCX text extraction |
| `src/lib/ai.js` | OpenRouter-backed AI helpers (extraction, question generation, text improvement) |
| `src/lib/i18n.jsx` | DE/EN translation dictionary + `useT()` hook |
| `src/views/*.jsx` | `Dashboard`, `JobsView`, `CandidatesView`, `InterviewsView`, `ArchiveView`, `NotesView`, `LoginPage` |
| `src/components/*.jsx` | Reusable UI: `Sidebar`, `Icon`, `Badge`, `PhotoUpload`, `DateField`, `ResumeUpload` |
| `vite.config.js` | Sets Vite `base` — **must match the app repo name** for GitHub Pages routing to work |
| `.github/workflows/deploy.yml` | CI: build with injected secrets → deploy to GitHub Pages on push to `main` |
| `INSTALLATION.md` | German step-by-step setup guide (Firebase, PAT, secrets, Pages) — the source of truth for setup order |

## Data model

Collections are arrays of plain objects, each with `id` (`crypto.randomUUID()`), `createdAt`/`updatedAt` timestamps. Notable fields:
- **Candidates**: `status` drives the pipeline (`Eingegangen → Erstgespräch → Technisches Gespräch → Ausgewählt/Abgelehnt`); status is auto-derived (upgraded, never downgraded) from the interview type added, via `deriveStatus()` in `CandidatesView.jsx`.
- **Interviews**: status uses `ivStatus` (`planned`/`done`/`noshow`) with a fallback to a legacy boolean `done` field for backward compatibility — keep both readable when touching this code (see `getIvStatus()`).
- **Archive**: archiving a job moves the job + its candidates + their interviews into one `archives` entry and removes them from the active collections; restoring reverses this.
- Resumes are stored separately per candidate at `data/resumes/<candidateId>.enc` (encrypted `{filename, base64 data}`), not inside the candidate record itself.

## Environment variables

Required at build time (GitHub Actions secrets → injected as `VITE_*`):

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO` (the **data** repo name), `VITE_GITHUB_TOKEN` (PAT, `repo` scope), `VITE_ENCRYPTION_SECRET`, `VITE_ALLOWED_EMAIL`, `VITE_OPENROUTER_API_KEY`.

For local dev, put these in a `.env.local` (gitignored) — `npm run dev` won't have working auth/storage without them.

## Commands

```bash
npm install       # deps
npm run dev       # local dev server (vite)
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

There is no test suite and no linter configured — don't assume `npm test` or `npm run lint` exist.

## Deployment

Push to `main` → `.github/workflows/deploy.yml` builds with the secrets above and deploys `dist/` to GitHub Pages via `actions/deploy-pages`. If you rename the app repo, update `base` in `vite.config.js` to match or the deployed app 404s on refresh/deep links.

## Things to watch for

- `src/components/ResumeUpload.jsx` and `src/views/Resumeupload.jsx` are near-duplicate components with slightly different props/behavior (`onNotesExtracted` vs `onDataExtracted`) — check which one a view actually imports before editing; don't assume changes to one apply to both.
- Large file handling (resume uploads, base64 encoding in `crypto.js` and `resume.js`) is deliberately chunked (8 KB) to avoid `Maximum call stack size exceeded` from spreading large `Uint8Array`s — keep that pattern for any new binary-handling code.
- `saveCollection` writes the entire collection file every time (no diffing) — be mindful of this when adding features that update collections frequently (e.g. avoid a save-per-keystroke).
- Both German and English strings exist for most UI text; when adding UI, add both `de` and `en` entries in `src/lib/i18n.jsx` rather than hardcoding a string.
