# Interview Tracker (Next.js + Firebase/Firestore)

A ready-to-run **Next.js (App Router) + Tailwind + Firebase/Firestore** app for tracking your job applications. It includes Google sign‑in, an Applications table with search/filter/sort, edit/delete, a Dashboard with charts (Recharts), CSV import, and a per‑application **status timeline drawer**.

---

## Features

* **Auth**: Google sign‑in (client‑side) with domain/redirect guardrails.
* **Applications**

  * Add new roles (with **Notes** and optional **Rejection Reason**).
  * List with **search**, **status filter**, and **sorting** by **Create Date**, **Update Date**, or **Status**.
  * Inline **status change** (records a status event + updates `statusUpdatedAt`).
  * **Details drawer** with a **timeline chart** linking all historical statuses by their update date.
  * Edit & **Delete** existing applications.
* **Dashboard**

  * **Daily / Weekly / Monthly** application counts.
  * **Status updates per day** timeline.
  * **Rejection reasons** pie chart.
  * (Also includes simple funnel/status & weekly trend components.)
* **CSV Import** (via PapaParse)

  * Validates required headers and previews row count before import.
  * Accepts ISO or epoch `createdAt` and parses `tags` lists.
* **Offline-ready** (IndexedDB cache enabled by default).

---

## Tech Stack

* **Next.js** (App Router, React 18)
* **Tailwind CSS**
* **Firebase** (Auth + Firestore)
* **Recharts** (visualizations)
* **PapaParse** (CSV parsing)

---

## Quick Start

### 1) Install

```bash
# from your Next.js project root
npm i firebase recharts papaparse
# Tailwind (if not already configured)
npx tailwindcss init -p
npm i -D tailwindcss postcss autoprefixer
```

### 2) Environment variables

Create `.env.local` (copy from `.env.example`) and fill from **Firebase Console → Project settings → General → Your apps → Web app**:

```env
NEXT_PUBLIC_FB_API_KEY=...
NEXT_PUBLIC_FB_AUTH_DOMAIN=...
NEXT_PUBLIC_FB_PROJECT_ID=...
NEXT_PUBLIC_FB_STORAGE=...
```

Restart dev server after editing envs.

### 3) Firebase Console configuration

* **Authentication → Sign‑in method**: Enable **Google** and set a **Support email**.
* **Authentication → Settings → Authorized domains**: add `localhost`, `127.0.0.1`, your preview/prod domains (e.g. `*.vercel.app`).
* **Firestore**: Create a database in production or test mode.
* **Indexes**: If prompted for an index on `users/{uid}/events` for `where(type=='status-change') + orderBy(at)`, click **Create index**.

> **Using emulators?** Google OAuth does **not** work with the Auth Emulator. Use real Auth in dev, or switch to email/password when on the emulator.

### 4) Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and **Sign in** from the navbar.

---

## Project Structure

```
.
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                        # Dashboard
│  ├─ add/page.tsx                    # Add job
│  ├─ import/page.tsx                 # CSV import
│  └─ applications/
│     ├─ page.tsx                     # Table (search/filter/sort + Details drawer)
│     └─ [id]/page.tsx                # Edit/Delete
├─ components/
│  ├─ Navbar.tsx
│  ├─ StatusBadge.tsx
│  ├─ ApplicationForm.tsx
│  ├─ ApplicationTable.tsx
│  └─ Charts/
│     ├─ CountsMultiPeriod.tsx        # Daily/Weekly/Monthly counts
│     ├─ StatusUpdatesTimeline.tsx    # Global: status updates per day
│     ├─ RejectionReasonsPie.tsx      # Rejection reasons breakdown
│     ├─ AppStatusTimeline.tsx        # Per‑app timeline (used in drawer)
│     ├─ FunnelByStatus.tsx
│     └─ AppsPerWeek.tsx
├─ lib/
│  ├─ firebase.ts
│  ├─ firestore.ts                    # CRUD + status events helpers
│  ├─ useUser.ts                      # Stable uid via auth listener
│  ├─ status.ts                       # Status constants + colors
│  ├─ types.ts                        # TS models
│  └─ utils.ts                        # Timestamp helpers, week key
├─ styles/
│  └─ globals.css
├─ tailwind.config.ts
├─ postcss.config.js
└─ .env.example
```

---

## Data Model

### Firestore Collections

* `users/{uid}/applications/{appId}`

  * **Core**: `title` (string), `company` (string), `status` (enum), `location` (string?), `jobUrl` (string?)
  * **Meta**: `priority` ('High'|'Medium'|'Low'?), `notes` (string?), `tags` (string\[]?)
  * **Timestamps**: `createdAt` (TS), `lastActionAt` (TS), **`statusUpdatedAt` (TS)**
  * **Outcomes**: `rejectionReason` (string?)

* `users/{uid}/events/{eventId}` (status timeline)

  * `type`: `'status-change'`
  * `appId`: string
  * `from`: Status (optional)
  * `to`: Status
  * `at`: timestamp

> `statusUpdatedAt` mirrors the latest status change and is used for sorting and display.

### Status Enum

`Saved | Applied | OA | Screen | Tech | Onsite | Offer | Accepted | Rejected`

---

## Key UI Flows

### Applications Table (`/applications`)

* **Search**: title/company/location/notes.
* **Filter**: by status.
* **Sort**: **Create date**, **Update date** (`statusUpdatedAt`), or **Status** (ordered via `STATUS_ORDER`).
* **Inline status change**: updates document and records an event; sets `statusUpdatedAt`.
* **Details Drawer**: click **Details** → opens a side drawer with:

  * Basic info (status, **Status updated** date, created date, notes).
  * **AppStatusTimeline** chart showing all historical statuses linked by update time.

### Add (`/add`)

* Create a new application with status, notes, and optional rejection reason (if status is `Rejected`).

### Edit/Delete (`/applications/[id]`)

* Edit fields and **on status change**: add a status event + update `statusUpdatedAt`.
* **Delete**: hard delete (optional: switch to soft delete with a `deletedAt` flag).

### Dashboard (`/`)

* **CountsMultiPeriod**: 3 cards — Daily(30), Weekly(12 ISO weeks), Monthly(12 months).
* **StatusUpdatesTimeline**: global count of status changes per day.
* **RejectionReasonsPie**: distribution of rejection reasons.
* (Sample funnel and weekly components also included.)

### CSV Import (`/import`)

* Upload `.csv` → validates and previews → import.
* **Required headers**: `title, company, status`
* **Optional**: `location, jobUrl, createdAt, notes, rejectionReason, priority, jobType, remote, tags`
* `createdAt`: ISO date (e.g., `2025-09-17`) **or** epoch millis.
* `tags`: comma/semicolon/pipe separated → parsed into `string[]`.

**Sample CSV**

```csv
title,company,status,location,jobUrl,createdAt,notes,rejectionReason,tags
Frontend Engineer,Acme,Applied,Remote,https://acme/jobs/fe,2025-09-01,Referral by Kim,,frontend;react
SWE Intern,Fabrikam,Rejected,NYC,,1693526400000,OA score 67%,No sponsorship,intern|newgrad
```

---

## Auth Notes & Troubleshooting

* **`auth/configuration-not-found`**: Enable **Google** provider for the **same project** named in `.env.local` and set Support email.
* **`auth/unauthorized-domain`**: Add your dev/prod domains under **Authentication → Settings → Authorized domains**.
* **Pop‑up blocked / Safari**: fall back to `signInWithRedirect` in your helper if needed.
* **UID lost on refresh**: use `useUser` (auth listener) instead of `auth.currentUser` at render time.
* **Events index needed**: accept the console prompt to create the composite index on `events`.

### Offline persistence

SDKs prior to v10 often use `enableIndexedDbPersistence(db)`. Newer SDKs recommend `initializeFirestore(app, { localCache: persistentLocalCache(/* optional: persistentSingleTabManager() */) })`. This repo uses the simpler approach; upgrade if you see deprecation warnings.

---

## Scripts

* `dev` – run locally
* `build` – create production build
* `start` – run production server

---

## Roadmap Ideas

* Soft delete & Archive view; bulk actions.
* Calendar reminders for follow‑ups / OA deadlines.
* Job page metadata scraping via server action or Cloud Function.
* Sharing/export (PDF, CSV export) and richer analytics.
* Advanced search (tags, company domain, tech stack).

---

## License

MIT — do what you like; contributions welcome.
