# Nekath native app

The current Expo/React Native app keeps the supplied Nekath design and implements its flows through a **typed, persistent mock API**. It runs without a remote backend. All astrology, AI, billing, identity and matching results remain demo data.

## Run

```sh
# From the repository root
yarn install
yarn ios
```

Use the pinned Yarn 4.6.0 version through Corepack (`corepack yarn install` if the `yarn` command is unavailable). Yarn uses `node_modules` for Expo compatibility; commit the root `yarn.lock` and use `yarn install --immutable` in CI. Install Expo packages from `mobile/` with `yarn expo install <package> --yarn`. The root `.yarnrc.yml` keeps app dependencies inside the mobile workspace and compresses cache archives.

Use Expo Go with an available simulator and avoid starting a second Metro on 8081. Bundled fonts work offline. Development walkthroughs can use `EXPO_PUBLIC_RECORDING_SESSION=<name>` to isolate their local data.

## Implemented

- Welcome, existing language labels, birth details and API place suggestions.
- First profile free; every additional creation has a separate simulated purchase. Edit/revision, switch, archive and restore profiles.
- Home summary and four reading categories, Rasi/Navamsha views, planet rows, plan-gated dasha rows, immutable saved chart snapshots.
- Reading reports with supporting traditional terms, meanings, optional period and selected checks; chart and Ask preserve the report's basis.
- Ask conversation history by person/snapshot, contextual fixture replies, enforced question credits and sample voice text.
- Daily date/place selection, calendar, main/subperiod labels and helpful/caution interval cards formatted in the selected place's timezone.
- Plans/credits, checkout approve/pending/decline/cancel, resume and purchase history; no real payment.
- Matrimony sample document/selfie/review, pending/rejection/resubmit, verified plan access, member filters/details, compatibility examples, saved members and sent/withdrawn demo interests.
- Loading, error/retry, retained mutation input and network scenario controls in Settings.
- Daily tathkala sample moment chart, Moon/tara bala/Chandrashtama factors and time/place selection.
- Premium life timeline with date/type filters and links to Daily; birth-time sensitivity examples for ±5/15/30 minutes.
- Persistent prediction journal with locked wording/chart basis, future windows, one-time outcomes after the window ends, and self-reported accuracy counts.
- Premium report snapshots with chart, timeline and journal content; actual native PDF export/share and browser print-to-PDF. Plans remain simulated one-time purchases.

## API integration

[Complete operation, field and screen mapping](../docs/backend/NEKATH-API-INTEGRATION.md), [43 request/response examples](../docs/backend/NEKATH-API-CATALOG.json), [new feature API guide](../docs/backend/INSIGHTS-API.md) and [typed contracts](src/api/contracts.ts). Mock and unused HTTP transports use the same operation interface; the unused HTTP adapter rejects demo store proofs and sample verification media. The integration document maps the current screen calls, DTOs and local mock state.

Charts are fixture allocations, not calculated horoscopes. Ask has prepared contextual replies, not live AI. Verification uses samples, not actual identity validation. Matching members are synthetic and interests send no external messages. Product prices are demo values. Real auth, calculations, payments, uploads, cloud sync, speech and full Sinhala/Tamil content are not connected. Detailed content falls back to English. Do not use this app as a prediction service.

## Storage and structure

AsyncStorage `nekath.app.v2` migrates `nekath.native.v1`, preserving the old key. Corrupt reads block writes; failed writes do not publish success. Saved snapshots remain attached to readings/conversations after edits. Development recording keys are separate; releases ignore the recording switch.

- `src/app`: Expo Router routes.
- `src/screens`: response-driven native UI.
- `src/api`: contracts, fixtures, serial mock engine, persistence/migration, hooks, endpoint and HTTP adapters.
- `src/store.tsx`: local hydration and committed mock state.
- `src/model.ts`: historical model retained for migration and regression tests.
- `src/ui.tsx`, `theme.ts`, `chart.tsx`: existing native design system.
- `src/reference.json`: design labels and source fixture content; not an ephemeris.

## Checks

```sh
yarn typecheck
yarn lint
yarn test
yarn export:ios
yarn api:examples
```

The iOS export checks the JS/assets bundle; it is not a signed App Store binary. Typecheck, lint, 15 tests and iOS export passed on 16 November 2026. Main flows were checked on the iPhone 17 iOS 26.2 simulator. Historical media, backups, plans and validation journals have been permanently removed.
