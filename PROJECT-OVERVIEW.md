# Nekath (Jyothisya) — Project Overview

What this repository is, how the frontend talks to a backend, and what was added in the latest (uncommitted) work: the **Insight features**.

---

## 1. What the project is

**Nekath** is an iOS-first Vedic astrology (*jyotisha*) app built with **Expo + React Native + TypeScript**.

- Real authentication, astrology calculations, payments and AI are **not connected**.
- Everything runs against a **typed, persistent mock API** that behaves like a future backend.
- The mock API doubles as the **contract** a backend team implements.

Yarn 4.6 workspace: one root lockfile, the app lives in `mobile/`.

```sh
yarn install
yarn ios
yarn check           # TypeScript, ESLint, tests, formatting
yarn api:examples    # regenerate examples, catalog and OpenAPI spec
```

## 2. Repository layout

```
jyothisya/
├── README.md
├── PROJECT-OVERVIEW.md           This file
├── docs/backend/
│   ├── openapi.json              OpenAPI 3 spec, all 43 operations (generated)
│   ├── NEKATH-API-CATALOG.json   Operation → method/path/example (generated)
│   ├── nekath-api-examples/      One request/response pair per operation (generated)
│   ├── INSIGHTS-API.md           Contract for the insight features
│   ├── FRONTEND-API-SHORT.md     What the frontend calls
│   └── NEKATH-API-INTEGRATION.md Backend API ↔ screen mapping
├── docs/superpowers/             Design spec + implementation plan
└── mobile/
    ├── src/app/                  Expo Router routes (one file per screen URL)
    ├── src/screens/              Screen components
    ├── src/api/                  Contracts, routes, mock backend, persistence
    ├── src/reports/              PDF/HTML report generation
    ├── scripts/                  generate-api-examples.ts, generate-openapi.ts
    └── tests/                    node:test suites
```

## 3. How the frontend gets all its data

Screens never read data from anywhere else: every screen calls `api.call(operation, input, idempotencyKey?)`.

| Layer | File | Role |
|---|---|---|
| Contract | `src/api/contracts.ts` | `Operations` type: each operation's `input`/`output`, plus `ApiError`. |
| Routes | `src/api/routes.ts` | **Single source of truth for endpoints** (43 operations: method, path, write flag). |
| Mock server | `src/api/mock.ts` | In-process implementation with delay, idempotency ledger and persistence. |
| HTTP client | `src/api/http.ts` | Real transport (`createHttpApi`), not enabled yet. Sends `{baseUrl}/v1{path}` with `Authorization: Bearer`, `Idempotency-Key` on writes, 15 s timeout. |
| Hooks | `src/api/hooks.ts` | `useQuery` / `useAction` used by screens. |

Conventions:

- Responses are `Envelope<T>`: `data` + `meta { requestId, source, localeUsed, fallback }`. A real backend must return `meta.source = "live"`.
- Path IDs (`:profileId`) are removed from the request; remaining GET fields become query parameters, and write fields become the JSON body.
- POSTs require `Idempotency-Key`: same key + same input replays the result; same key + different input → `IDEMPOTENCY_CONFLICT`.
- State is stored under `nekath.app.v2` with save-before-publish: if the write fails, nothing changes.

### Endpoints by area

| Area | Endpoints |
|---|---|
| App / account | `GET /bootstrap`, `GET /places`, `PATCH /me/preferences`, `POST /me/active-profile`, `GET/POST /me/verification` |
| Profiles | `GET/POST /profiles`, `PATCH /profiles/:id`, `PATCH /profiles/:id/archive` |
| Charts | `GET /profiles/:id/home`, `GET /profiles/:id/charts/:kind`, saved charts (GET, POST, `DELETE /saved-charts/:id`) |
| Readings & chat | `POST /readings`, `GET /readings/:id`, conversations (list, create, get), `POST /conversations/:id/messages` |
| Billing | `GET /billing/products`, `/purchases` (list, create, get, `/verify`, `/cancel`) |
| Daily | `GET /profiles/:id/daily` |
| Matching | `/matches`, `/favorites`, `/interests` |
| **Insights (new)** | `GET /profiles/:id/tathkala`, `/timeline`, `/birth-time-sensitivity`; `GET/POST /profiles/:id/predictions`; `POST /predictions/:id/review`; `GET/POST /profiles/:id/reports`; `GET /reports/:id` |

## 4. What we built — the Insight features

| Feature | Screen / route | API operation(s) |
|---|---|---|
| Daily **Tathkala** (moment chart for a chosen local time) | section in Daily (`Tathkala.tsx`) | `tathkala` |
| **Life timeline** (dasha / transit / eclipse) | `/timeline` | `timeline` |
| **Birth-time sensitivity** | `/birth-time-sensitivity` | `birthTimeSensitivity` |
| **Prediction journal** (record now, review after the window ends) | `/journal` | `journal`, `createPrediction`, `reviewPrediction` |
| **PDF reports** (immutable snapshot, exported as PDF) | `/reports` | `reports`, `createReport`, `report` |

Entry points: Home gets an "Explore and keep track" section; Charts gets sensitivity/timeline/PDF buttons; Daily accepts `date` and `profileId` route params so timeline events deep-link into it.

### 4.1 Types — `src/api/insights.ts`

Every response carries an `InsightBasis` so the UI can honestly say data is a fixture:

```ts
export type InsightBasis = { source: "mock" | "live"; method: string; notice: string };

export type Prediction = {
  id: string; profileId: string;
  chartSnapshotId: string;            // chart the prediction was made against (frozen)
  statement: string; criteria: string;
  targetStart: string; targetEnd: string;
  timezone: string; createdAt: string;
  review: { outcome: "hit" | "partial" | "miss"; notes: string; reviewedAt: string } | null;
};
```

### 4.2 Contract and routes

Nine operations were added to `Operations` in `contracts.ts`, and `Entitlements` gained `features: { timeline, journal, pdfReports }`. `routes.ts` binds each to HTTP:

```ts
timeline:         { method: "GET",  path: "/profiles/:profileId/timeline" },
createPrediction: { method: "POST", path: "/profiles/:profileId/predictions", write: true },
reviewPrediction: { method: "POST", path: "/predictions/:id/review",          write: true },
```

### 4.3 Mock behaviour — `src/api/insight-operations.ts`

`mock.ts` delegates insight operations to `handleInsight(db, request, now, getChart)`, which finds the profile (`NOT_FOUND` if missing/archived) and enforces:

| Rule | Error |
|---|---|
| `timeline`, `createPrediction`, `createReport` need a premium plan | `PLAN_REQUIRED` |
| Dates 1900–2200, `HH:mm` time, ordered range, supported place | `VALIDATION` |
| Sensitivity window is 5, 15 or 30 minutes | `VALIDATION` |
| Statement 1–2000 chars, criteria 1–1000 | `VALIDATION` |
| Prediction must start after today in its timezone | `VALIDATION` |
| Review only after the whole window has ended | `REVIEW_NOT_DUE` |
| Review is written once | `ALREADY_REVIEWED` |

IDs, timestamps, timezone and chart snapshot are generated server-side, never accepted from the client. `createReport` builds a frozen `ReportDocument` (chart, timeline, journal summary, sensitivity note). Journal score:

```
scorePercent = round(100 * (hits + 0.5 * partials) / reviewed)   // null when reviewed = 0
```

### 4.4 Persistence — `database.ts`, `insight-storage.ts`

`Database` gained `predictions[]` and `reports[]`; old saves load them as empty. `validateInsightStorage` runs on load and **throws instead of silently dropping data** (duplicate IDs, bad ownership, impossible windows, invalid timezones, premature reviews).

### 4.5 Screens

`Journal.tsx` (summary card, filters, locked-entry form, one-time review form, `PremiumGate`), `Timeline.tsx`, `Sensitivity.tsx`, `Tathkala.tsx`, `Reports.tsx`, plus shared `insight-ui.tsx`. Each file in `src/app/` is a one-line re-export, e.g. `export { Journal as default } from "../screens/Journal";`.

### 4.6 PDF reports — `src/reports/`

- `html.ts` → `reportHtml(report)`: A4 printable HTML, every field passed through `escapeHtml`.
- `export.ts` → `exportReport(report)`: native uses `expo-print` + `expo-sharing` (falls back to system print); web prints an isolated hidden iframe.

The API returns structured content only, never a PDF URL.

### 4.7 Premium access

| Plan | Access |
|---|---|
| Free | Daily + tathkala, sensitivity, read/review existing journal entries, read/export existing reports |
| Graha / Jyotisha | Also timeline, new predictions, new reports |

Billing is simulated.

## 5. Error codes

`VALIDATION`, `NOT_FOUND`, `PLAN_REQUIRED`, `REVIEW_NOT_DUE`, `ALREADY_REVIEWED`, `IDEMPOTENCY_REQUIRED`, `IDEMPOTENCY_CONFLICT`, `STORAGE_FAILED`. Error body: `{ error: { code, message, retryable, fields? } }`.

## 6. API documentation for the backend team

| Artifact | What it is |
|---|---|
| `docs/backend/openapi.json` | OpenAPI 3 spec for all 43 operations: paths, params, idempotency header, request/response schemas, error shape. |
| `docs/backend/NEKATH-API-CATALOG.json` | Operation → method, path, example file. |
| `docs/backend/nekath-api-examples/*.json` | One real request/response pair per operation. |
| `docs/backend/AI-BACKEND-SPEC.md` | Backend AI spec: Ask, readings, narratives, credits, safety, fallbacks. |
| `INSIGHTS-API.md`, `NEKATH-API-INTEGRATION.md`, `FRONTEND-API-SHORT.md` | Rules, validation, errors, screen mapping. |

All generated files come from one command: `yarn api:examples`. OpenAPI schemas are **inferred from the mock's real responses**, so enums and optional fields are described only in the prose docs.

## 7. What the backend team must still do

- Replace fixtures with real calculations (moment positions, dashas, transits, eclipses, ascendant sign-crossings).
- Resolve historical timezone offsets and ambiguous/nonexistent local times at DST changes.
- Authenticate every request and enforce ownership on every profile, prediction, report and snapshot (including ID-only routes).
- Enforce immutability and trustworthy timestamps server-side.
- Specify the auth/token flow (not documented yet) and hydrate account and entitlements from the server; replacing only the transport is not enough.
- Define a real media-upload contract for `submitVerification` and a store-receipt contract for `verifyPurchase` (both blocked in `http.ts`).
- Never return `source: "live"` around unchanged fixture data.

## 8. Tests and status

- `mobile/tests/insights.test.ts` uses a harness with a controllable clock and a switchable "disk full" failure. It covers premium gating, validation, review timing, immutability, idempotent replay, storage failure and HTML escaping.
- `yarn check` (TypeScript, ESLint, 22 tests, Prettier) passes.
- All work is **uncommitted** on `master`.
