# Codex Lab — Manga Reader

A React and TypeScript app for discovering manga through MangaDex, reading chapters, keeping a personal library, and publishing reviews. The interface also uses the names **DexReader** and **MangaReader Bento**.

This is an MVP with automated tests and documented limitations. You can run the public catalog without Firebase. Each installation can optionally connect its own Firebase project for Google sign-in, profiles, libraries, and reviews. No maintainer Firebase project configuration or user data is included.

## Features

- Home feed with featured titles and catalog lists.
- Title search with debounce and shareable search URLs, on desktop and mobile.
- Manga details and chapter language selection.
- Reader with page/chapter navigation, fullscreen mode, and image preloading.
- Optional Google sign-in, editable profiles, reading lists, favorites, and reading progress.
- Public reviews with ratings, editing, deletion, and sharing actions.
- Favorite-genre statistics and local achievements; some achievements and feed labels are still simulated.
- Fixed-origin catalog proxy and restricted image proxy.
- Bounded catalog caching, request coalescing, outbound pacing and upstream cooldown handling.

Manga metadata and images come from third parties. This repository does not contain a manga collection. The image proxy transmits images and may cache responses; the software does not grant rights to third-party content.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, React Router 7 |
| Styling and charts | Tailwind CSS 4, Lucide, Recharts |
| Reader state | Zustand |
| Development and build | Vite 6, tsx |
| Local server | Express 4, Node fetch |
| Optional identity and storage | Firebase Authentication, Firestore |
| Testing | Vitest 5, Testing Library, Supertest, Playwright, Firestore emulator |

## Quick start

Requirements: **Node.js 24 LTS**, npm, and Git. **Java 21** is also required for Firestore emulator tests.

```sh
git clone https://github.com/Matheus-Alves-Alexandre/Codex-Lab-Open.git manga-reader
cd manga-reader
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The public catalog requires internet access. With no Firebase configuration, catalog browsing and reading work while account features stay disabled. No Gemini API key is required.

## Connect your own Firebase

1. Create your own Firebase project and register a web app.
2. Enable Google sign-in, authorize your development/production domains, and create a Firestore database.
3. Run the local configuration wizard:

   ```sh
   npm run setup:firebase
   ```

4. Enter the web app configuration from your Firebase console. The wizard creates `.env.local`, which is ignored by Git, and refuses to overwrite an existing file.
5. Deploy this repository's `firestore.rules` to **your** database, then restart the development server or rebuild the frontend.

For manual setup, copy `.env.example` to `.env.local` and fill in the `VITE_FIREBASE_*` values. Follow the [Firebase setup guide and data model](docs/FIREBASE.md) for the exact mapping, rules deployment, named databases, and emulator mode. The guide follows the [official Firebase web setup](https://firebase.google.com/docs/web/setup).

Only generic rules, a data blueprint, and emulator settings are versioned. Personal `.env` files, `.firebaserc`, legacy applet configuration, and service-account files are ignored. `VITE_*` values are public browser configuration; never place Admin SDK credentials or private keys in them.

### Local emulators

```sh
npm run emulators
```

In `.env.local`, set `VITE_FIREBASE_PROJECT_ID=demo-codex-lab` and `VITE_FIREBASE_EMULATORS=true`, then start the app in another terminal. Auth uses `127.0.0.1:9099`; Firestore uses `127.0.0.1:8080`. MangaDex still requires internet access.

## Tests and security checks

```sh
npx playwright install chromium
npm run test:all
npm run audit:security
```

| Command | Purpose |
| --- | --- |
| `npm test` | Unit, component, hook, page, dependency compatibility, and local HTTP tests |
| `npm run test:watch` | Interactive test runner |
| `npm run test:coverage` | Tests with coverage thresholds and HTML report |
| `npm run typecheck` | TypeScript validation |
| `npm run lint` | Legacy alias for typecheck; does not run ESLint |
| `npm run check` | Typecheck, coverage, and production build |
| `npm run test:rules` | Firestore authorization tests against a local demo emulator |
| `npm run test:e2e` | Chromium desktop and mobile viewport flows |
| `npm run test:all` | All checks, Firestore rules, browser tests and local load scenarios |
| `npm run audit:security` | Audit all installed production and development dependencies |
| `npm run test:live` | Optional read-only smoke test against a running server and real MangaDex API |
| `npm run test:load` | Eight local API load/failure scenarios with 1,000 virtual users and a synthetic upstream |
| `npm run test:load:soak` | Load scenarios plus a 60-second warm-catalog soak |

Browser tests use controlled catalog/image responses and an isolated server on port 3100. They do not sign in to a real Google account or write to production Firebase. The live smoke test defaults to `http://127.0.0.1:3000` and accepts `SMOKE_BASE_URL`.

Reports are generated in `coverage/`, `playwright-report/`, and `test-results/`, all ignored by Git. See the [test plan](docs/TESTES.md), [dependency remediation notes](docs/DEPENDENCIES.md), and [clean-history verification](docs/SECRET-AUDIT.md). The [Quality workflow](.github/workflows/ci.yml) checks the complete Git history for secrets and runs the dependency audit and test suites on pushes and pull requests.

The load suite never targets the real MangaDex API or Firebase. It verifies local shared-catalog traffic and deliberate overload behavior; it is not a production 1,000-user guarantee. Read the [capacity test methodology and deployment plan](docs/SCALING.md) and [recorded results](docs/CAPACITY-RESULTS.md) before scaling. Limits are process-local: multiple serverless instances need a central gateway or shared coordination.

## Production build

```sh
npm run build
npm start
```

The server serves `dist/`, SPA deep links, `/api/catalog`, and `/api/image-proxy`. Install the complete dependency set: the server uses tsx and imports Vite. Set `PORT` to change the default port. `npm run preview` serves the frontend only and does not provide API proxies.

Firebase variables are embedded at build time. Set them in your hosting provider's environment settings before building. There is also a Vercel image function and rewrite configuration; validate that adapter in your own hosting environment.

## Project structure

```text
api/                 Vercel catalog adapter and shared image handler
server/              HTTP app, catalog cache and outbound scheduler
scripts/             Firebase setup, live smoke and local load runner
src/api/             MangaDex clients and cover URLs
src/components/      UI components and reader controls
src/hooks/           Catalog, authentication, library, profile, and reviews
src/lib/             Environment-based Firebase setup and achievements
src/pages/           Home, search, details, reader, profile, and library
src/store/           Reader page state
tests/unit/          Unit and integration tests
tests/rules/         Firestore authorization contracts
tests/e2e/           Browser flows using synthetic data
tests/load/          Isolated quota-enforcing upstream fixture
docs/                Setup, tests, dependency changes, and technical assessment
```

Routes: `/`, `/search?q=...`, `/manga/:id`, `/reader/:chapterId`, `/chapter/:chapterId` (legacy), and `/profile`. The library is part of the profile. Personal data uses `users/{uid}` and `users/{uid}/library/{mangaId}`; public reviews use `reviews/{uid}_{mangaId}`. Achievements use per-user localStorage and do not sync across devices.

## Contributing and project status

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [technical assessment](docs/AVALIACAO.md). Current priorities include production capacity validation, chapter pagination, accurate feed labels, bundle size, and completing achievements.

**License pending:** the repository does not yet have a license covering the entire project. An Apache-2.0 header exists in `src/App.tsx`; the maintainer still needs to review provenance and add a project-wide `LICENSE` before announcing an open-source release. Third-party dependencies and content retain their own terms.

## Support

If this project is useful to you, you can support my work:

**[☕ Buy Me a Coffee — xxlozerxd](https://buymeacoffee.com/xxlozerxd)**
