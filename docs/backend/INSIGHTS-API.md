# Daily tathkala, timeline, journal, sensitivity and PDF reports

Updated 18 November 2026. These frontend flows use the persistent local mock API.
The `/v1` routes below are proposed backend contracts, not deployed endpoints.
Astrological responses are labelled fixtures. Journal entries/reviews are user-entered
local records. Billing is simulated; PDF generation/export is implemented on the client.

## Shared contract

All calls return `Envelope<T>`: `data` plus `meta.requestId`, `source`,
`localeUsed`, and `fallback`. All POST operations require `Idempotency-Key`.
Same operation/key/input replays the original result; changed input conflicts.
The mock retains the latest 250 mutation replay results. A production backend
must authenticate the account and enforce ownership on every profile, prediction,
report and referenced snapshot, including ID-only read/review routes.

`InsightBasis` contains `source: mock|live`, `method`, and `notice`. Screens and
reports display it. The current demo returns sample values independent of birth
details; passing another time or date does not produce actual calculations.
Detailed content uses English, with the existing locale fallback metadata.

## Operations

| Operation | Method and route (under `/v1`) | Input | Response |
|---|---|---|---|
| `tathkala` | GET `/profiles/:profileId/tathkala` | `profileId, localDate, localTime, placeId` | `Tathkala` |
| `timeline` | GET `/profiles/:profileId/timeline` | `profileId, fromDate, toDate` | `LifeTimeline` |
| `birthTimeSensitivity` | GET `/profiles/:profileId/birth-time-sensitivity` | `profileId, uncertaintyMinutes` | `BirthTimeSensitivity` |
| `journal` | GET `/profiles/:profileId/predictions` | `profileId` | `PredictionJournal` |
| `createPrediction` | POST `/profiles/:profileId/predictions` | `profileId, statement, criteria, targetStart, targetEnd` | `Prediction` |
| `reviewPrediction` | POST `/predictions/:id/review` | `id, outcome, notes` | reviewed `Prediction` |
| `reports` | GET `/profiles/:profileId/reports` | `profileId` | `ReportDocument[]`, newest first |
| `createReport` | POST `/profiles/:profileId/reports` | `profileId` | immutable `ReportDocument` |
| `report` | GET `/reports/:id` | `id` | `ReportDocument` |

Path IDs are removed from HTTP request bodies. Other GET fields become URL query
parameters. See [typed contracts](../../mobile/src/api/insights.ts),
[operation definitions](../../mobile/src/api/contracts.ts), and the
[generated catalog](NEKATH-API-CATALOG.json) for complete JSON examples of all nine, and
[openapi.json](openapi.json) for a machine-readable spec of every operation.

## Daily tathkala

Daily retains its existing `daily` operation and adds a separate `tathkala` call.
The selected date/place are shared; users choose the local time (default 12:00).
Dates are real calendar dates between `1900-01-01` and `2200-12-31` inclusive;
time is strictly 24-hour `HH:mm`. Unknown places reject with `VALIDATION`.

`Tathkala` returns `profileId`, `natalSnapshotId`, the selected `localDate`,
`localTime`, `placeId`, IANA `timezone`, a sample `momentChart: ChartSnapshot`,
`factors[] {name,value,meaning}`, and `basis`. The example factors show Moon sign,
tara bala and Chandrashtama. No notifications are scheduled.

The moment chart has a separate ID/method but reuses demo natal allocations.
It is response-only and is not persisted as a natal snapshot. Production must
replace these allocations with calculated moment positions and comparisons;
resolve historical timezone offsets and explicitly reject/resolve ambiguous or
nonexistent local times at daylight-saving transitions. This mock only echoes
local time and timezone and makes no instant/precision claim.

## Life timeline

`fromDate` and `toDate` are inclusive, valid dates in the same supported range,
with `fromDate <= toDate`. Response contains profile and chart snapshot IDs,
the requested bounds, `basis` and `events[]` with `id`, `kind`
(`dasha|transit|eclipse`), `startDate`, `endDate`, `title`, `description`.
An event is included if its interval overlaps the requested range. Results are
sorted by start date then ID. The frontend offers event-type filtering, an empty
state and a link from each event's start date to Daily for the same profile.

Fixtures contain the chart's sample dasha rows, an example Saturn interval and an
example eclipse marker. The latter is explicitly not an astronomical eclipse date.
There are no computed Sade Sati/Rahu-return periods or significance ratings yet.

## Birth-time sensitivity

`uncertaintyMinutes` is exactly `5`, `15` or `30`. Response contains profile and
chart IDs, the selected uncertainty, `crossesSignBoundary`, `samples[]`
(`offsetMinutes, ascendant, degreeLabel`), and `basis`.
Samples use offsets `-window,0,+window`. The current response always demonstrates
a sign-boundary warning; it does not determine the user's actual uncertainty.
A production calculator must sample/reliably bracket ascendant sign crossings,
including crossings between sample endpoints, before asserting the flag.
The original birth details remain unchanged.

## Prediction journal

`Prediction` contains `id`, `profileId`, immutable `chartSnapshotId`, `statement`,
`criteria`, `targetStart`, `targetEnd`, captured IANA `timezone`, `createdAt`, and
`review: null | {outcome,notes,reviewedAt}`. Server/mock supplies IDs, timestamps,
timezone and basis; clients cannot inject them through the create request.

- Trimmed statement: 1–2000 characters; criteria: 1–1000 characters.
- Dates must be valid and ordered; start must be strictly after today in the
  current timing preference's timezone, which is captured with the entry.
- No edit/delete operations are exposed. Changes to the birth profile or timing
  preference do not change existing entries or their chart/timezone basis.
- A review is accepted only when today's date in the entry's captured timezone
  is strictly later than `targetEnd`. The entire end date remains unreviewable.
- Outcome: `hit|partial|miss`; trimmed evidence notes: 1–2000 characters.
- Review is written once. A new attempt after review returns `ALREADY_REVIEWED`;
  an exact idempotent replay returns the original review.

`PredictionJournal` returns `profileId`, newest-first `entries` and `summary`:
`total`, `reviewed`, `hits`, `partials`, `misses`, `due`, `scorePercent`.
`due` counts unreviewed entries after their complete window. Score is rounded
`100 * (hits + 0.5 * partials) / reviewed`; it is `null` when reviewed is zero.
Pending/unreviewed entries never inflate the score. Results are self-reported,
not scientific validation. Local storage is editable outside the app; production
immutability and trustworthy timestamps must be enforced by a backend.

## Premium plans and reports

`Entitlements.features` adds booleans `timeline`, `journal`, `pdfReports`.
Both Graha and Jyotisha enable all three. Free users can use Daily/sensitivity
and read/review existing predictions or read/export existing reports. Creating
predictions, querying the timeline or creating reports requires a premium plan,
enforced in the mock API as well as the frontend. Existing product IDs, one-time
prices, credit behavior and simulated checkout are retained. There are no live
subscriptions, renewals, expiry events or real store charges.

`ReportDocument` includes immutable `id`, profile/chart IDs, `title`, `createdAt`,
`localeUsed: en`, captured `profile {name,dob,time,place,revision}`, `basis`,
and `sections[] {title,paragraphs:string[]}`. A full report captures the demo
chart/positions, demo timeline, journal score and entries, and sensitivity limitation.
Reports do not change when a profile or journal changes; create another to refresh.

The API returns structured content, not HTML or a PDF URL. The client escapes
every text field into printable HTML. Expo Print generates a PDF in native cache;
Expo Sharing opens save/share targets, with system printing as fallback. Web
prints an isolated report document and offers the browser's Save as PDF option.
No report is automatically sent or uploaded. User chooses the destination.
API failures retain the action for retry; export failures leave the saved report
available for another export without creating another report.

## Errors and persistence

| Code | Meaning |
|---|---|
| `VALIDATION` | Invalid date/time/window/text/uncertainty/place/outcome |
| `NOT_FOUND` | Missing/archived profile or missing record |
| `PLAN_REQUIRED` | Premium operation attempted on free access |
| `REVIEW_NOT_DUE` | Target window has not fully ended |
| `ALREADY_REVIEWED` | Outcome is already locked |
| `IDEMPOTENCY_REQUIRED` / `IDEMPOTENCY_CONFLICT` | Missing key / changed retry payload |
| `STORAGE_FAILED` | Change was not committed; retry with retained input |

Storage remains `nekath.app.v2` with `predictions` and `reports` collections.
Old v2 saves missing the collections load them as empty. Null/malformed
collections, invalid references, impossible prediction windows, invalid timezones
or premature stored reviews block loading rather than silently discarding data.
All mutations use the existing serialized save-before-publish mechanism.

For live integration, also implement authoritative account/entitlement hydration:
the current Provider reads local mock state, so replacing the transport alone is
insufficient. Use actual calculation provenance and review/auth timestamps;
do not return `source: live` around unchanged fixture outputs.

PDF package references: [Expo Print](https://docs.expo.dev/versions/latest/sdk/print/)
and [Expo Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/).
