# Contributing

Use Node 24 LTS and install dependencies with `npm ci`. Follow the README for catalog-only mode, your own Firebase project, or local emulators.

1. Describe the problem or proposal and the expected behavior in an issue.
2. Create a descriptive branch and keep pull requests focused.
3. Add a regression test when fixing a reproducible bug.
4. Run `npm run test:all` with Java 21 and Chromium available, and `npm run audit:security`.
5. Describe the behavior change and validation in the PR. Include desktop and mobile evidence for UI changes.

Pages coordinate UI; hooks own data access/state; HTTP clients live in `src/api/`. Keep the image handler shared across deployment adapters. Data changes must preserve the contracts in `tests/rules/`.

Do not commit personal Firebase settings, service accounts, `.env*` files, builds, dependencies, or generated reports. Use synthetic data/images for tests. Update documentation and the lockfile when changing commands, configuration, or dependencies.

Dependency overrides are intentional and documented in `docs/DEPENDENCIES.md`. Do not remove them without running the audit and compatibility tests. A project-wide license must be established before accepting public contributions under defined distribution terms.
