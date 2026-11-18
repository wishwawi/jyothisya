# Insight Features Implementation Plan

**Goal:** Deliver the five requested frontend features and their API documentation.

**Architecture:** Extend the existing operation-based API and local persistence;
keep insight DTOs/fixtures isolated. Screens use current query/action hooks and
native design components. Reports render structured snapshots to escaped HTML.

**Tech stack:** Existing Expo/React Native/TypeScript, AsyncStorage, Expo Print/Sharing.

**Spec:** `docs/superpowers/specs/2026-11-18-insight-features-design.md`

## Global constraints

- Preserve current product IDs and five tabs.
- Calculations and billing remain explicitly simulated.
- Journal statements and reviews are immutable; capture original chart/timezone.
- Use the current idempotency and persistence mechanisms.

## Review focus

- Invalid dates/times and reversed windows must reject without writes.
- Review must wait until the final target date has ended in the captured timezone.
- Missing new storage collections must migrate; malformed collections must reject.
- Free access must reject premium mutations even if a screen is bypassed.
- User text must remain escaped in exported report HTML.

## Task 1: Contracts, fixtures and operations

- [x] Add insight DTOs in `mobile/src/api/insights.ts`, export them from contracts,
  and extend operations/routes with all nine new calls.
- [x] Add fixture builders and journal summary helpers in `api/insight-fixtures.ts`.
- [x] Add persistent collections, validation and mock operation handlers.
- [x] Add behavioral tests covering access, journal lifecycle, migration and snapshots.

## Task 2: Native interfaces

- [x] Add focused Timeline, Journal, Sensitivity and Reports screens/routes.
- [x] Extend Daily with time selection and a provenance-labelled tathkala view.
- [x] Add Home/Charts entry points and plan feature descriptions.
- [x] Preserve busy/error/retry/empty states and retained form input.

## Task 3: PDF export

- [x] Add Expo-compatible Print/Sharing dependencies.
- [x] Build escaped, paginated report HTML with profile and basis metadata.
- [x] Add native PDF sharing and web print fallback; test injection escaping.

## Task 4: Backend handoff and checks

- [x] Generate an example for every new API operation and update the catalog.
- [x] Update short and detailed integration docs, storage and access rules.
- [x] Run typecheck, lint, tests, formatting, API-example generation and iOS bundle export.
- [ ] Verify rendered native screens and PDF sharing on device/simulator. Runtime UI verification was unavailable in this session; bundle export is not device validation.
