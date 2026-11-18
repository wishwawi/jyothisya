# Insight features: frontend and API design

## Authorized scope

Implement Daily tathkala, life timeline, prediction journal, birth-time sensitivity,
premium access and PDF reports in the existing Expo app. Add typed operations,
persistent mock behavior, HTTP route mappings and backend integration examples.
This is a frontend/API-contract delivery. No live astronomical calculation service,
store billing, remote deployment or notification delivery is included. All
astrological fixtures are explicitly labelled; recorded user outcomes are real local data.

## Interaction and boundaries

- Preserve the current colours, fonts, native components and five tabs.
- Daily adds a selected local-time tathkala section with moment-chart fixture,
  tara bala, Moon sign, Chandrashtama, provenance and timezone.
- Charts links to sensitivity, timeline and reports. Home links to timeline,
  journal and reports so every feature is discoverable.
- Timeline accepts an inclusive date range, displays fixture dasha/transit events
  in chronological order and links dates to Daily. No fabricated accuracy claims.
- Sensitivity accepts a symmetric 5/15/30-minute uncertainty window and displays
  sampled relative offsets and example ascendants. This is not birth-time rectification.
- Journal saves statement, success criteria and a future inclusive date window.
  Text/basis/window cannot be edited or deleted. Reviews are accepted only after
  the complete window has ended in its captured timezone. One immutable review
  records hit/partial/miss plus evidence notes. Score is (hits + partials/2)/reviewed;
  unreviewed entries are excluded and counts remain visible. Zero reviews means no score.
- Reports are immutable structured snapshots of profile, chart, timeline and
  journal summary; native export creates and shares an actual PDF. Web uses print.

## Persistence and access

Add optional-on-read journal/report collections to v2 storage, defaulting missing
collections for existing installs. Validate new persisted records and ownership.
Retain the original chart basis across profile edits. All writes use existing
serialization, idempotency and save-before-publish behavior.

Free: Daily, sensitivity, reading/reviewing existing journal records and reports.
Graha/Jyotisha: timeline, new journal entries and new PDF reports. Plans remain
explicitly simulated one-time purchases with existing product IDs; no subscription claims.
Gate premium operations in the mock API as well as the interface.

## API contract

Add tathkala, timeline, birthTimeSensitivity, journal, createPrediction,
reviewPrediction, reports, createReport and report operations. Response provenance
and calculation-method labels distinguish sample data. Backend must enforce account
ownership, plan access, authoritative timestamps and immutable journal/report data.

## Verification

Exercise date/time validation, free-plan rejection, future-only entry creation,
end-of-window review, idempotent retry, profile isolation, snapshot preservation,
score denominators, storage migration/corruption and HTML escaping. Run typecheck,
lint, tests, formatting, API-example generation and the iOS bundle export. Inspect
the app visually when a runtime is available and disclose any untested native behavior.
