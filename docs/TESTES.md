# Test plan and results

Local application validation on 2026-10-15, before the clean Git-history initialization. The 77 application, configuration, script, and test files were verified unchanged by SHA-256 during that reset, so the runtime results below retain their original scope. Environment: Windows, Node 24.22.0, Java 21, and Playwright Chromium. Linux CI is configured but has not run on GitHub yet.

## Coverage by area

| Area | Suite | Main contracts |
| --- | --- | --- |
| MangaDex clients | `api.test.ts` | Encoding, filters, relationships, languages, ascending order, pagination parameters, HTTP errors |
| Images | `proxy.test.ts` | URL policy, credentials/ports, repeated parameters, methods, redirects, MIME, size, timeout, bytes |
| HTTP server | `server.test.ts` | Health, API 404, shared image validation |
| Catalog proxy | `catalog-proxy.test.ts` | Fixed origin, no credential forwarding, read-only methods, HEAD, Retry-After, JSON, size, network failure |
| Catalog hooks | `catalog-hooks.test.tsx` | Success/failure, debounce, URL state, stale responses, page reset |
| Authentication | `auth.test.tsx` | Listener cleanup, login/logout, SDK failures, no Firebase in catalog-only mode |
| Personal data | `firebase-hooks.test.tsx` | Owner paths, timestamps, CRUD, rollback, ordering, deterministic review IDs, logout cleanup |
| Achievements | `achievements.test.tsx` | Unique IDs, conditions, invalid storage, persistence, manual unlock, logout |
| Firebase bootstrap/setup | `firebase-config.test.ts`, `firebase-setup.test.ts` | Demo defaults, complete configuration, local env generation, injection rejection, emulator selection |
| Dependency overrides | `dependency-compat.test.ts` | Literal rules-file watcher, CommonJS uuid multipart boundary, PubSub tracing initialization |
| Components | `components.test.tsx` | Navbar search/keyboard, ratings, page/chapter controls, cards, favorites, carousel, achievements, chart data, copy link |
| Pages | `pages.test.tsx` | Home, search, details, async review form, profile editing, library fallback |
| Reader | `reader.test.tsx` | Chapter order, page reset, one progress attempt, library loading, success/failure confirmation |
| Firestore rules | `tests/rules/firestore.test.ts` | Owner isolation, public reviews, valid CRUD, forbidden fields/types/sizes/timestamps/identity |
| Browser flows | `tests/e2e/site.spec.ts` | Main routes, errors, legacy links, mobile search, viewport width, no Firebase calls in catalog-only mode |
| Real integration | `scripts/smoke-live.mjs` | Running server reaching the public MangaDex catalog/detail/feed |

Unit suite filenames above are under `tests/unit/` unless otherwise specified.

## Final combined run

`npm run test:all` exited with code 0:

- **158 unit/local integration tests** across 14 files.
- **28 rule tests** using the real Firestore emulator.
- **28 browser scenarios**: 14 desktop Chromium and 14 Pixel 7 viewport scenarios, with no skips.
- TypeScript and production build passed.
- Coverage: **89.36% lines**, **87.22% statements**, **81.48% functions**, **71.85% branches**.
- Separate real integration smoke passed after the catalog proxy replacement.
- `npm run audit:security` reported zero vulnerabilities across all dependencies.

Vitest coverage includes application source and HTTP/image handlers, excluding `src/main.tsx` and type declarations. Setup helper behavior is tested separately. Coverage measures executed code, not product completeness. Thresholds are 65% for lines/statements/functions and 60% for branches.

## Reproduce

```sh
npm ci
npx playwright install chromium
npm run test:all
npm run audit:security
```

Java 21 must be on PATH. The first emulator run may download its runtime. Browser tests start their own server on port 3100; Firestore uses 8080 and auxiliary emulator ports. Local loopback must be allowed for Supertest, Playwright, and Firebase.

Reports: `coverage/index.html`, `playwright-report/index.html`, and `test-results/` screenshots/traces. These are generated locally and ignored by Git.

For the optional real smoke, keep `npm run dev` or a built `npm start` server running. Run `npm run test:live` in another terminal. Override `SMOKE_BASE_URL` for a different port. It reads four public endpoints and makes no Firebase writes.

## Limits

- Browser tests mock catalog/images. They do not validate current MangaDex image hosts, latency, limits, or all schema changes.
- The live smoke checks metadata, not entire chapter downloads or OAuth.
- There is no complete real Google login → library → review → logout browser scenario. SDK behavior is mocked in hooks; authorization is tested separately in the emulator.
- Mobile uses a Chromium viewport, not a physical phone or Safari/WebKit.
- Fullscreen, external sharing apps, accessibility, loading under poor networks, and performance need additional validation.
- Proxy tests cover policy/limits, not an infrastructure/DNS penetration test.
- Vercel deployment, named databases, and legacy user data require their own staging validation.
- Dependency override tests cover the workflows this app uses, not every unrelated Firebase CLI/cloud service.

Add a regression case that fails for the observed cause before fixing a bug. Keep user-isolation and failure scenarios; do not lower thresholds to hide regressions.
