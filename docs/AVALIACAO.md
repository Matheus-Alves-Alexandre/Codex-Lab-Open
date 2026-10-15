# Technical assessment — 2026-10-15

## What this project is

A manga discovery/reading MVP with a React frontend and a small HTTP layer for MangaDex. Optional Firebase stores profiles, libraries, and public reviews. The server has no separate application database or administrative API.

Pages, components, hooks, and API clients provide a useful starting structure. The main workflows are functional, but simulated labels, pagination, independent hook state, and incomplete achievements remain product limitations.

## Completed improvements

- Added unit/integration tests, Firestore rule tests, desktop/mobile browser tests, coverage reports, a live smoke test, and CI.
- Restricted image URLs, redirects, MIME types, methods, timeout, and response size.
- Replaced the catalog middleware with a fixed-origin Node fetch proxy; validated JSON, read-only methods, timeout, and response size.
- Removed unused Gemini configuration/dependency. The previous build definition could have exposed a key if referenced; no actual exposure was established.
- Deleted the legacy Firebase applet configuration. Configuration now comes from ignored local environment files, with a setup wizard, data model, emulator instructions, and catalog-only mode.
- Corrected ascending chapter navigation and async review-form synchronization.
- Added stale-response guards in catalog hooks and cleared previous chapter pages.
- Ended profile/library loading after failures and corrected optimistic favorite rollback.
- Confirmed reader progress only after successful persistence, with loading/error guards and one attempt per user/chapter.
- Hardened achievement storage parsing, preserved valid stored IDs, cleared state on logout, and cleaned up the timer.
- Tightened Firestore field whitelists, profile/review limits, integer ratings, document identity, and timestamp contracts.
- Enabled navbar search on mobile and made the production/clean commands portable.
- Resolved all 15 remaining npm dependency alerts. The latest full audit reports **zero vulnerabilities**; see [DEPENDENCIES.md](DEPENDENCIES.md) for overrides and their limits.

## Remaining priorities

These findings are based on source inspection unless a specific test is cited. They do not imply observed exploitation or data loss.

| Priority | Evidence | Impact and next step |
| --- | --- | --- |
| High | `useLibrary` owns independent state in every component instance | Repeated Firestore reads and inconsistent immediate updates. Centralize session/library state with a shared store/provider and cache/listener |
| High | `useChapterFeed` loads only the first 100 chapters | Long series and chapter navigation become incomplete. Add pagination and define a language/edition-aware sequence |
| Before public release | No project-wide `LICENSE` | Review provenance and choose distribution terms |
| Medium | `LibraryPage` compares chapter-number text with a chapter UUID | Incorrect New!! badge. Store/compare consistent chapter metadata |
| Medium | Home feed uses `Promise.all` | A single failure removes all sections. Add section-level recovery and explicit retry feedback |
| Medium | Spring 2026 label uses a `year=2024` query; Self-Published is simulated | Make labels match the actual selection criteria |
| Medium | Compact cards display fixed language/chapter/group/time text | Replace placeholders with real metadata or remove them |
| Medium | Achievements panel changes `showAll` without rendering a full list | Complete View All and remove the hidden demonstration unlocker |
| Medium | Achievement `mangasRead` counts library entries | Define actual reading events and cross-device persistence |
| Medium | Session-switch cancellation is not uniform across all data hooks | Add concurrency/account-switch tests while centralizing data state |
| Medium | Production bundle remains around 1.18 MB minified/~328 kB gzip | Add route splitting and review Firebase/Recharts loading; Core Web Vitals have not been measured |
| Medium | Write failures do not always produce useful form feedback | Restore submission state and offer explicit retry |
| Medium | Proxies have per-request limits but no client rate limits | Configure hosting-level quotas based on real usage |
| Low | Frequent `any`, mixed UI languages, and several product names | Tighten response/document types and standardize identity/language |

## Validation and release status

The original test preparation reported 40 audit alerts, reduced first to 15 and now to zero. No severity filters or development-package exclusions are used. The [audit snapshot](npm-audit-2026-10-15.json) is time-specific; rerun `npm run audit:security` before releases.

Typechecking, build, **158 unit/integration tests**, **28 Firestore rule tests**, and **28 browser scenarios** passed in the final combined run. The replacement catalog proxy also passed the live read-only MangaDex smoke test. See [TESTES.md](TESTES.md) for coverage and limits.

The source now starts with a fresh local Git history, disconnected from the former remote. Its initial commit is checked for secrets; see [SECRET-AUDIT.md](SECRET-AUDIT.md). The workflow has not been executed on GitHub. The original remote and any existing deployment were not changed. Public release still needs a license decision and verification of the destination repository. These changes do not certify production readiness.
