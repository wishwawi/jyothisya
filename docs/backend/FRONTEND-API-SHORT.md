# Current Nekath frontend API

App version **1.0.0** · Updated against source, 18 November 2026. All active calls use the persistent local mock API. `/v1` paths are the mapping defined by the unused HTTP adapter, not deployed endpoints. No login provider is configured.

See [Insights API](INSIGHTS-API.md) for the complete new feature contracts and examples.

## Endpoint mapping

GET inputs are query parameters; path IDs are removed from request bodies. Mock mutations require an idempotency key.

| Screen / feature | Endpoint(s) | Main input → response |
|---|---|---|
| Contract only | `GET /bootstrap` | Available in mock API; UI currently hydrates local storage |
| Birth / location | `GET /places` | `query` → place ID, label, coordinates, IANA timezone |
| Profile list / create | `GET /profiles`; `POST /profiles` | `includeArchived?` / `{draft}` → profiles / created person |
| Edit / select / archive | `PATCH /profiles/:profileId`; `POST /me/active-profile`; `PATCH /profiles/:profileId/archive` | `{revision,draft}` / `{profileId}` / `{archived}` → updated person |
| Home | `GET /profiles/:profileId/home` | → Lagna/Rashi/Nakshatra, category access, credits |
| Charts | `GET /profiles/:profileId/charts/:kind` | `kind=rasi\|navamsha`, `snapshotId?` → cells, positions, Dasha, method/version |
| Saved charts | `GET /profiles/:profileId/saved-charts`; `POST /profiles/:profileId/saved-charts`; `DELETE /saved-charts/:id` | `{snapshotId,title}` on save → bookmarks / saved item / removed |
| Reading report | `POST /readings`; `GET /readings/:id` | `{profileId,category}` → explanation, factors, period window, chart basis |
| **Daily** | **`GET /profiles/:profileId/daily`** | **`localDate,placeId` → daily explanation, calendar, life period, helpful/caution intervals** |
| Daily tathkala | `GET /profiles/:profileId/tathkala` | `localDate,localTime,placeId` → moment-chart fixture, timezone, tara bala/Moon/Chandrashtama examples, provenance |
| Life timeline | `GET /profiles/:profileId/timeline` | `fromDate,toDate` → chronological sample dasha/transit/eclipse events; premium |
| Birth-time sensitivity | `GET /profiles/:profileId/birth-time-sensitivity` | `uncertaintyMinutes=5|15|30` → sample ascendants and boundary warning |
| Prediction journal | `GET/POST /profiles/:profileId/predictions`; `POST /predictions/:id/review` | list/record immutable future entries; review hit/partial/miss after the entire window; summary score |
| PDF reports | `GET/POST /profiles/:profileId/reports`; `GET /reports/:id` | list/create/read immutable report content; frontend generates native PDF or browser print |
| Ask history / new thread | `GET /profiles/:profileId/conversations`; `POST /conversations`; `GET /conversations/:id` | `{profileId,chartSnapshotId?}` on create → fixed person/chart context and messages |
| Ask answer | `POST /conversations/:conversationId/messages` | `{text}` → saved question/answer, evidence references, remaining credits |
| Plans / checkout | `GET /billing/products`; `POST /purchases` | `{productId,draft?}` on create → priced products / purchase intent |
| Purchase state / history | `GET /purchases/:id`; `GET /purchases` | → awaiting, pending, failed, fulfilled or cancelled |
| Purchase verification / cancel | `POST /purchases/:id/verify`; `POST /purchases/:id/cancel` | `{proof}` on verify → purchase and granted entitlements; no duplicate grants |
| Verification | `GET /me/verification`; `POST /me/verification` | sample document/selfie input → simulated review status |
| Matrimony | `GET /matches`; `GET /matches/:id` | `query?,city?,minAge?,maxAge?` → members / detail and compatibility checks |
| Saved members | `GET /favorites`; `POST /favorites` | `{matchId,saved}` on mutation → saved members / saved flag |
| Interests | `GET /interests`; `POST /interests` | `{matchId,withdraw?}` on mutation → sent/withdrawn status |
| Settings | `PATCH /me/preferences` | `{language?,timingPlaceId?}` → preferences |


`GET /conversations/:id` is also contract-only: Ask currently gets messages from the conversation list. All other listed operations are used by the current screens.

## Daily: current fields only

```http
GET /v1/profiles/:profileId/daily?localDate=2026-11-16&placeId=colombo
```

| Response field | Screen use |
|---|---|
| `profileId`, `chartSnapshotId` | Person and saved natal chart basis |
| `localDate`, `place` | Selected day, city and IANA timezone |
| `headline`, `body`, `assessment` | Reading heading, explanation and supportive/mixed/care label |
| `lifePeriod.main`, `lifePeriod.sub` | Dasha main/subperiod labels |
| `panchanga[].name/term/value` | Calendar rows: Tithi, Vara, Nakshatra, Yoga, Karana |
| `intervals[].startAt/endAt` | Helpful/caution boundaries, formatted in `place.timezone` |
| `intervals[].assessment/activity` | Helpful/care label and activity |
| `intervals[].factors[].term/meaning` | Traditional term and understandable explanation |
| `source` | Mock data provenance |

Daily returns fixtures. The new `tathkala` endpoint and Daily section display a sample moment chart and comparison factors with explicit `basis` provenance; they do not calculate planetary positions or natal/transit comparisons. Prashna, Pancha Pakshi, change-time precision and notification delivery remain unimplemented. The original `daily` DTO is unchanged.

## Current access rules

First profile free; each additional person requires a fulfilled `extra_profile` demo purchase. Saved charts and archive/restore are separate. Plans unlock reading categories and Dasha display; Matrimony additionally requires demo verification. Saved answers consume question credits.

## Responses

```json
{"data":{},"meta":{"requestId":"req_1","source":"mock","localeUsed":"en","fallback":false}}
```

Mock errors use `ApiError` with `code`, `message`, `retryable` and optional `fields`; the HTTP adapter expects these under an `error` object on non-2xx responses. Screens show loading, retry and retained mutation input. Detailed content falls back to English for Sinhala/Tamil selections.

[All 43 current request/response examples](NEKATH-API-CATALOG.json) · [Detailed operation and screen mapping](NEKATH-API-INTEGRATION.md).
