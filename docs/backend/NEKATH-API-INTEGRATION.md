# Current Nekath API and screen mapping

App version **1.0.0** · 18 November 2026 · Runtime: persistent mock API, local account and AsyncStorage schema v2. No remote backend or authentication provider is connected.

The new Daily tathkala, life timeline, prediction journal, birth-time sensitivity,
premium access and PDF report flows are documented in [Insights API](INSIGHTS-API.md),
including all nine new operation paths, DTO fields, validation, immutability,
timezone handling, access rules and backend integration requirements.

## Source of truth

- [Typed requests and responses](../../mobile/src/api/contracts.ts)
- [Endpoint path/method mapping](../../mobile/src/api/routes.ts)
- [Mock operations and access rules](../../mobile/src/api/mock.ts)
- [Current synthetic response data](../../mobile/src/api/fixtures.ts)
- [Runtime storage](../../mobile/src/store.tsx)
- [43 operation examples](NEKATH-API-CATALOG.json)
- [Insight DTOs](../../mobile/src/api/insights.ts) and [mock insight handlers](../../mobile/src/api/insight-operations.ts)

Example JSON files are captured from the mock API. IDs are opaque and the examples are not a database import. Regenerate from the repository root with `yarn api:examples`; the generator checks that every operation has an example. The catalog's `v1-proposed` label refers to the unconnected HTTP mapping, not another app version.

## Transport and state

Screens call `Api.call(operation,input,idempotencyKey?)`; no HTTP request is made. The unused [HTTP adapter](../../mobile/src/api/http.ts) maps paths below under `/v1`, adds a bearer token/idempotency header, applies a 15-second timeout, and expects a live response envelope. It rejects demo purchase proofs and all current sample-verification submissions.

Success shape:

```json
{"data":{},"meta":{"requestId":"req_1","source":"mock","localeUsed":"en","fallback":false}}
```

The mock throws `ApiError` with code/message/retryable/optional field errors. The HTTP adapter expects `{ "error": { "code": "VALIDATION", "message": "…", "retryable": false } }` on non-2xx responses. Query hooks provide loading/error/Retry; mutation errors retain input. Replays use the same request key. Conflicting payloads return `IDEMPOTENCY_CONFLICT`.

The mock serializes calls, saves before publishing state, and keeps the latest 250 mutation replay results. Screens also read committed mock state for selected person, plan, credits, favourites and interests. The HTTP adapter is not a drop-in replacement for this local state model.

## Operations and screen fields

Path parameters are removed from HTTP bodies; remaining GET inputs become query parameters. The complete operation input appears below.

| Operation / method / path | Request input | Response → UI / action |
|---|---|---|
| `bootstrap` GET `/bootstrap` | `{}` | `account, profiles, activeId, preferences, entitlements` → contract-only operation. Current Provider hydrates local DB; no screen calls bootstrap. [JSON](nekath-api-examples/bootstrap.json) |
| `places` GET `/places` | `query` | `Place[]` → birth suggestions, Daily/Settings place chips, Matrimony city filters. Each place includes ID, country, IANA timezone and coordinates. [JSON](nekath-api-examples/places.json) |
| `preferences` PATCH `/me/preferences` | optional `language, timingPlaceId` | saved preferences → language labels and timing location; refresh dependent screens. [JSON](nekath-api-examples/preferences.json) |
| `profiles` GET `/profiles` | optional `includeArchived` | `Profile[]` → Profile list, selected/archive states. [JSON](nekath-api-examples/profiles.json) |
| `createProfile` POST `/profiles` | `draft` | new Profile → selected person, chart preparation and Home. First creation free only. [JSON](nekath-api-examples/createProfile.json) |
| `updateProfile` PATCH `/profiles/:profileId` | `profileId, revision, draft` | Profile with incremented revision → refresh latest chart; old snapshots remain immutable. [JSON](nekath-api-examples/updateProfile.json) |
| `selectProfile` POST `/me/active-profile` | `profileId` | Profile → active Home/Charts/Ask/Daily context. [JSON](nekath-api-examples/selectProfile.json) |
| `archiveProfile` PATCH `/profiles/:profileId/archive` | `profileId, archived` | Profile → archive or restore, select next active if needed. Does not refund/reset free profile. [JSON](nekath-api-examples/archiveProfile.json) |
| `home` GET `/profiles/:profileId/home` | `profileId` | `profile.name`, `summary.lagna/rashi/nakshatra`, `categories[].title/description/locked`, `entitlements` → Home cards and category access. [JSON](nekath-api-examples/home.json) |
| `chart` GET `/profiles/:profileId/charts/:kind` | `profileId, kind`, optional `snapshotId` | ChartSnapshot → `cells` chart grid; `positions` accessible rows; `summary` labels; `dashas` timeline; `method` basis. Optional snapshot selects preserved revision. [JSON](nekath-api-examples/chart.json) |
| `saveChart` POST `/profiles/:profileId/saved-charts` | `profileId, snapshotId, title` | SavedChart bookmark → saved feedback/list. Duplicate snapshot saves return existing item. [JSON](nekath-api-examples/saveChart.json) |
| `savedCharts` GET `/profiles/:profileId/saved-charts` | `profileId` | SavedChart[] → title/date/open snapshot/remove. [JSON](nekath-api-examples/savedCharts.json) |
| `removeSavedChart` DELETE `/saved-charts/:id` | `id` | `removed` → remove bookmark; chart snapshot is retained for readings/conversations. [JSON](nekath-api-examples/removeSavedChart.json) |
| `createReading` POST `/readings` | `profileId, category` | Reading → open report; first free category claimed per person. Other categories require plan. [JSON](nekath-api-examples/createReading.json) |
| `reading` GET `/readings/:id` | `id` | `title/headline/body/assessment`, `factors[].term/meaning/basisRef`, `window`, `checks` → report, supporting factors, optional period and dosha checks. `profileId/chartSnapshotId` → exact chart/Ask context. [JSON](nekath-api-examples/reading.json) |
| `products` GET `/billing/products` | `{}` | Product[] → plan/credits cards, price from `amountMinor/currency`, entitlement copy. [JSON](nekath-api-examples/products.json) |
| `createPurchase` POST `/purchases` | `productId`, `draft` required for extra profile | Purchase intent → Checkout; no allocation yet. Frozen draft belongs to this creation purchase. [JSON](nekath-api-examples/createPurchase.json) |
| `purchase` GET `/purchases/:id` | `id` | Purchase → Checkout status, failure, pending/resume or completion. [JSON](nekath-api-examples/purchase.json) |
| `purchases` GET `/purchases` | `{}` | Purchase[] → newest-first history and resume links. [JSON](nekath-api-examples/purchases.json) |
| `verifyPurchase` POST `/purchases/:id/verify` | `id, proof` | Purchase → fulfilled only after approval; profileId on additional-profile fulfilment; credits/plan refreshed. [JSON](nekath-api-examples/verifyPurchase.json) |
| `cancelPurchase` POST `/purchases/:id/cancel` | `id` | cancelled Purchase → cancellation feedback, no allocation. Fulfilled orders cannot be cancelled here. [JSON](nekath-api-examples/cancelPurchase.json) |
| `conversations` GET `/profiles/:profileId/conversations` | `profileId` | Conversation[] → newest-first history, title chips. [JSON](nekath-api-examples/conversations.json) |
| `createConversation` POST `/conversations` | `profileId`, optional `chartSnapshotId` | Conversation with fixed person and snapshot → new thread. Without snapshot uses latest Rasi. [JSON](nekath-api-examples/createConversation.json) |
| `conversation` GET `/conversations/:id` | `id` | Conversation → direct detail retrieval supported by contract; current Ask list already includes messages. [JSON](nekath-api-examples/conversation.json) |
| `sendMessage` POST `/conversations/:conversationId/messages` | `conversationId, text` | `conversation.messages` → user/assistant cards, `evidenceRefs` → chart link; `creditsRemaining` → balance. One saved answer consumes one credit atomically. [JSON](nekath-api-examples/sendMessage.json) |
| `daily` GET `/profiles/:profileId/daily` | `profileId, localDate, placeId` | Daily → `headline/body/assessment`, `lifePeriod`, `panchanga`, `intervals[].startAt/endAt/activity/assessment/factors` → date/place reading, helpful/caution cards, traditional names with explanations. [JSON](nekath-api-examples/daily.json) |
| `verification` GET `/me/verification` | `{}` | Verification → not_started/pending/verified/rejected; reason and resubmit CTA; polls during pending. [JSON](nekath-api-examples/verification.json) |
| `submitVerification` POST `/me/verification` | `documentType, documentFixtureId, selfieFixtureId, demoOutcome` | pending Verification → sample document/selfie/review journey. **Mock-only media input; blocked by HTTP adapter.** [JSON](nekath-api-examples/submitVerification.json) |
| `matches` GET `/matches` | optional `query, city, minAge, maxAge` | Match[] → synthetic member cards, filters and empty result. Requires plan and verified state. [JSON](nekath-api-examples/matches.json) |
| `match` GET `/matches/:id` | `id` | Match → name/age/city/occupation/about/interests and `compatibility.method/checks[].name/result/meaning`. [JSON](nekath-api-examples/match.json) |
| `favorite` POST `/favorites` | `matchId, saved` | `{matchId,saved}` → save/unsave icon; deduplicated membership. [JSON](nekath-api-examples/favorite.json) |
| `favorites` GET `/favorites` | `{}` | Match[] → saved member cards. [JSON](nekath-api-examples/favorites.json) |
| `interest` POST `/interests` | `matchId`, optional `withdraw` | Interest → sent/withdrawn status; same record reused; local simulation sends no message. [JSON](nekath-api-examples/interest.json) |
| `interests` GET `/interests` | `{}` | Interest[] → history/status and member links. [JSON](nekath-api-examples/interests.json) |


`bootstrap` and `conversation` detail retrieval exist in the API but are not called by the current UI. Ask reads messages from `conversations`; app startup loads AsyncStorage.

## Current data and behaviour

**Profiles:** `BirthDraft` contains name, dob (`YYYY-MM-DD`), time (`HH:MM`), place, isExample and optional placeId. First creation is free; each additional person requires its own approved `extra_profile` purchase. Archive/restore and saved chart views do not create another person. Editing increments the profile revision; saved charts/readings/conversations retain their original snapshot.

**Charts:** Rasi and Navamsha only. `cells` drives the grid; `positions` drives readable planet rows. `summary` contains Lagna/Rashi/Nakshatra and lord labels. `method` contains ID/label/version. `dashas` contains lord/startDate/endDate/current rows. All allocations, dates and interpretation factors are fixtures, not calculated from birth details.

**Readings:** `love`, `career`, `health` (Wellbeing) and `dosha`. Reports contain title/headline/body/assessment, supporting term/meaning/basis references, optional period window and selected checks. A free profile can select one reading category; a plan unlocks the rest.

**Ask:** Conversations bind person and chart snapshot. New conversations use latest Rasi unless a snapshot is supplied. Messages up to 2,000 characters receive contextual fixture answers for Lagna/Dasha/Hora/relationships or a generic fallback. One persisted answer consumes one credit; zero balance is rejected. Voice action inserts sample text without recording audio.

**Daily:** Input is profileId/localDate/placeId. Response contains natal chartSnapshotId, location/timezone, headline/body/assessment, main/subperiod labels, five calendar rows and helpful/caution UTC intervals with activity and traditional term/meaning. The UI formats intervals in the chosen timezone. Calendar values and timing factors are fixtures. The new Daily tathkala section uses a separate `tathkala` operation with time selection, a sample moment chart and explicit `basis` provenance; see [Insights API](INSIGHTS-API.md). No ephemeris, real transit-comparison engine, Prashna or Pancha Pakshi calculation is connected.

**Matrimony:** Paid plan plus demo verified status gates browsing. Verification uses NIC/Passport and selfie samples; a simulated pending review finishes as verified/rejected. Members are synthetic adults. Filters cover search/city/age. Details show selected Dina/Gana/Rajju compatibility examples; no complete Porondam calculator runs. Favourites and sent/withdrawn interests persist locally and send no external messages.

**Purchases:** Graha LKR990/3 credits; Jyotisha LKR2490/15 credits; extra profile LKR490; five questions LKR490. All prices and entitlements are mock values. Status is awaiting_confirmation/pending/failed/fulfilled/cancelled. Pending/failed can retry or cancel. Approved fulfilment grants one profile or the product's plan/credits; repeated fulfilment does not grant twice. Fulfilled purchases cannot be cancelled here. Both paid plans unlock Matrimony subject to verification. The active app submits demo proof only, although the type also defines Apple/Google proof shapes.

**Settings and persistence:** Language labels support en/si/ta; detailed content remains English with fallback metadata. Normal/slow/offline/error_once controls exercise request states. Storage `nekath.app.v2` migrates `nekath.native.v1` without deleting the old key. Development recording namespaces isolate walkthrough data. Read failure blocks writes; commit failure does not publish successful state.

## Validation

[API tests](../../mobile/tests/api.test.ts) cover creation/purchase rules, replay/concurrency, credits, revisions, saved basis, persistence rollback, timing zones, verification/matching gates, migration and HTTP mapping. [Legacy model tests](../../mobile/tests/model.test.ts) cover the migration input model. Typecheck, lint, 15 tests and iOS bundle export passed on 16 November 2026; main flows were checked on iPhone 17 / iOS 26.2. This is a mock app, not a signed production release.
