# Backend AI specification

Status: **proposed**. Today every AI-style answer in the app is a hard-coded fixture
(`mobile/src/api/mock.ts`, `fixtures.ts`). This document says what a real backend
must do to replace them without changing the frontend contract.

The frontend already calls the endpoints below. A conforming backend replaces the
mock behind the **same routes and response shapes**; see
[openapi.json](openapi.json) and [nekath-api-examples](nekath-api-examples/).

## 1. Where AI is used

| Feature | Operation | Route | AI role |
|---|---|---|---|
| Ask a question | `sendMessage` | `POST /v1/conversations/:conversationId/messages` | Answer a user question about their chart |
| Start a thread | `createConversation` | `POST /v1/conversations` | Binds person + chart snapshot (no AI call) |
| Category reading | `createReading` | `POST /v1/readings` | Write headline/body/factors for love, career, health, dosha |
| Daily guidance | `daily` | `GET /v1/profiles/:profileId/daily` | Narrative text over calculated panchanga/intervals |
| Tathkala | `tathkala` | `GET /v1/profiles/:profileId/tathkala` | Meaning text for calculated factors |
| Reports | `createReport` | `POST /v1/profiles/:profileId/reports` | Compose sections from stored data (no new claims) |

Principle: **calculation first, language second.** Astrology values (positions,
dashas, panchanga, intervals) come from a deterministic calculation service. The
AI only explains them. The model must never invent a position, date or period.

## 2. Architecture

```
App ──HTTPS──> API gateway (auth, idempotency, entitlements, rate limits)
                 ├─> Calculation service  (deterministic; chart snapshots)
                 ├─> Context builder      (selects facts for the prompt)
                 ├─> LLM provider         (answer / reading text)
                 ├─> Output validator     (schema, grounding, safety)
                 └─> Store                (conversations, readings, credits ledger)
```

1. Load the conversation and its **immutable chart snapshot** (`chartSnapshotId`).
2. Context builder gathers only facts from that snapshot (and the dasha/transit data derived from it).
3. Prompt the model with those facts plus the user's question and recent messages.
4. Validate the output (section 6). On failure retry once, then fall back (section 7).
5. Persist the messages and debit one credit in a single transaction.

## 3. `sendMessage` (Ask)

Request body: `{ "text": string }`. Path supplies `conversationId`. Header
`Idempotency-Key` is **required**.

| Rule | Behaviour |
|---|---|
| Text | Trimmed, 1–2000 chars, else `VALIDATION` |
| Ownership | Conversation must belong to the authenticated account, else `NOT_FOUND` |
| Credits | Need at least 1, else `CREDITS_REQUIRED` (no model call is made) |
| Billing | One persisted answer = one credit. Failed/fallback answers cost **nothing** |
| Atomicity | User message, assistant message, title and credit debit commit together or not at all |
| Idempotency | Same key + same text replays the stored answer, with no second model call and no second debit; different text → `IDEMPOTENCY_CONFLICT` |
| Title | First message sets `title` = first 80 chars of the question |

Response (unchanged contract):

```json
{
  "data": {
    "conversation": {
      "id": "chat_…", "profileId": "p_…", "profileName": "…",
      "chartSnapshotId": "chart_…", "title": "…", "createdAt": "…",
      "messages": [
        { "id": "msg_…", "role": "user", "text": "…", "createdAt": "…", "evidenceRefs": [] },
        { "id": "msg_…", "role": "assistant", "text": "…", "createdAt": "…", "evidenceRefs": ["chart_…"] }
      ]
    },
    "creditsRemaining": 2
  },
  "meta": { "requestId": "…", "source": "live", "localeUsed": "en", "fallback": false }
}
```

`evidenceRefs` must list the chart snapshot ID plus any factor IDs the answer relied on.
The app links these to the chart. Never return refs that were not supplied in the prompt context.

### Context given to the model

- Person: name, birth date/time/place, timezone, profile revision.
- Chart snapshot summary: lagna, rashi, nakshatra, planet positions (sign, house, degree), current dasha chain.
- Conversation history: last N messages (suggest 10) of this conversation only.
- Locale (`en`, with fallback metadata for other languages).

Never include: other people's profiles, other conversations, payment data, or auth tokens.

## 4. `createReading`

Request: `{ profileId, category }`, category ∈ `love | career | health | dosha`.

- Free plan: one category per person (the first one chosen); others → `PLAN_REQUIRED`. Paid plans unlock all.
- Same person + category + chart snapshot returns the **existing** reading (idempotent by content, not only by key).
- Output must satisfy the existing `Reading` type: `title`, `headline`, `body`, `assessment` (`supportive|mixed|care`), `factors[] {id, term, meaning, basisRef}`, optional `window`, `checks[]`.
- Every `factors[].basisRef` must reference a real fact in the snapshot. Readings are stored and immutable.

## 5. Narrative for `daily` and `tathkala`

Calculated fields (panchanga, intervals, positions, `factors[].value`) come from the
calculation service. AI may write only `headline`, `body`, `meaning`, and interval
`activity` text. `assessment` values must come from rules, not free text. Cache narratives per
(profile revision, date, place, locale) to control cost.

## 6. Safety, grounding and output validation

Every model response is validated **before** it is stored or returned.

1. **Schema**: structured outputs for readings; plain text length limit (suggest ≤ 1500 chars) for chat.
2. **Grounding**: any sign, house, planet, dasha or date mentioned must exist in the supplied context. Reject or regenerate if not.
3. **No guarantees**: no certainty about future events, death, pregnancy, legal outcomes, or investment results. Use hedged traditional-interpretation language.
4. **Health, legal, finance, self-harm**: do not give diagnosis, treatment, legal or investment advice. For self-harm or crisis messages, skip astrology and return a supportive message with local support resources; do not debit a credit.
5. **Prompt injection**: user text and any profile text are data, never instructions. Do not follow requests to reveal prompts, other users' data or to change rules.
6. **PII**: log request IDs, not message bodies, unless the user consented; redact birth data in provider logs where possible.
7. **Provenance**: set `meta.source = "live"` **only** when output is genuinely model/calculation-backed. Never wrap fixture content in `live`.

## 7. Failure and fallback

| Situation | Response | Credit |
|---|---|---|
| Provider timeout / 5xx | `503`, `error.code = "AI_UNAVAILABLE"`, `retryable: true` | Not debited |
| Validation fails twice | `AI_UNAVAILABLE` or a safe generic answer with `meta.fallback = true` | Not debited |
| Provider rate limited | `429`, `retryable: true` | Not debited |
| Content blocked | Safe refusal message stored as the assistant answer | Not debited |
| Client retry with same key | Replay stored result | No second debit |

Suggested timeouts: 20 s server-side to the provider; the app's own limit is 15 s, so
use asynchronous completion or streaming if answers may take longer (see section 10).

## 8. Credits and entitlements

- Balance is server-authoritative; the app displays `creditsRemaining` only.
- Debit uses a ledger row (account, conversation, message ID, request ID, delta) in the same transaction as the saved answer.
- Credits and plans come from fulfilled purchases (`verifyPurchase`) with real store receipts. The demo proof must be rejected.
- Add a read endpoint or `bootstrap` field for the balance so the app no longer relies on local state.

## 9. Operational requirements

| Concern | Requirement |
|---|---|
| Auth | Bearer token on every call; ownership checked on conversation, reading, profile, snapshot IDs |
| Rate limits | Per account (suggest 20 messages/hour) and per IP; return `429` + `Retry-After` |
| Cost control | Max input tokens per request, cap history, cache readings, per-account daily token budget |
| Observability | Log request ID, model, token counts, latency, validation outcome; dashboard for fallback and rejection rates |
| Model changes | Version the prompt and model; store `modelVersion` and `promptVersion` per answer for audits |
| Data retention | Define retention and deletion for conversations; support account deletion |
| Privacy | Birth data is personal data; disclose provider use and region in the privacy policy |
| Testing | Golden-question set (Lagna, Dasha, Hora, love, unknown), injection set, crisis set, grounding checks; run on every prompt/model change |

## 10. Open decisions for the backend team

1. **Streaming**: current contract returns the whole conversation in one response. Streaming (SSE) or polling would need a contract change.
2. **Languages**: answers are English with `localeUsed`/`fallback` metadata; decide which languages are supported and how fallback is flagged.
3. **Provider and model**: not specified here; must support structured outputs and provide data-processing terms.
4. **History window and retention**: confirm N messages and retention period.
5. **Voice**: the app's voice action inserts sample text only; no audio is sent. A real speech-to-text path needs its own spec.

## 11. Acceptance checklist

- [ ] `sendMessage` keeps the response shape in `openapi.json`; the app needs no code change.
- [ ] Duplicate request with the same `Idempotency-Key` never calls the model or debits twice.
- [ ] Zero credits returns `CREDITS_REQUIRED` without calling the provider.
- [ ] Failed or fallback answers are not billed.
- [ ] Every `evidenceRefs` and `basisRef` resolves to supplied context.
- [ ] Crisis, medical, legal and prompt-injection tests pass.
- [ ] `meta.source = "live"` only for real model/calculation output.
- [ ] Conversation and reading IDs enforce account ownership.
