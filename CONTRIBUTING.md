# Contributing

Use Node 24 LTS and install dependencies with `npm ci`. Follow the README for catalog-only mode, your own Firebase project, or local emulators.

1. Describe the problem or proposal and the expected behavior in an issue.
2. Create a descriptive branch and keep pull requests focused.
3. Add a regression test when fixing a reproducible bug.
4. Run `npm run test:all` with Java 21 and Chromium available, and `npm run audit:security`.
5. Describe the behavior change and validation in the PR. Include desktop and mobile evidence for UI changes.

## Development and protected main

Use `dev` for local frontend work. Start the app with `npm run dev` and run the relevant tests before pushing. Open a pull request from `dev` or a focused feature branch to `main` when the change is ready.

`main` requires a pull request and successful `secrets` and `tests` checks from GitHub Actions, with the branch up to date. These requirements also apply to administrators; force pushes and deletion are disabled. Human review is welcome but is not a required approval gate. A failing or pending mandatory check prevents merging into `main`.

The Quality workflow runs unit/component/API tests, Firestore rule tests, desktop/mobile browser flows, catalog load scenarios, type checks, dependency audit and build. Download `test-reports` from the workflow run for coverage, browser traces/screenshots, load results and `ci-logs/`. Reports and Actions logs have a 14-day retention policy. Emulator data is synthetic; never add production credentials to tests.

The versioned `.github/main-protection.json` records the API configuration; GitHub enforces the repository setting, not this file by itself. A repository administrator can reapply it and the retention policy using:

```sh
gh api --method PUT repos/Matheus-Alves-Alexandre/Codex-Lab-Open/branches/main/protection --input .github/main-protection.json
gh api --method PUT repos/Matheus-Alves-Alexandre/Codex-Lab-Open/actions/permissions/artifact-and-log-retention -H 'X-GitHub-Api-Version: 2026-03-10' -F days=14
```

This repository has no deployment/publishing workflow. The protected branch gates code entering `main`; any future website or package publisher must explicitly depend on the mandatory successful checks and must not deploy directly from `dev`.

Pages coordinate UI; hooks own data access/state; HTTP clients live in `src/api/`. Keep the image handler shared across deployment adapters. Data changes must preserve the contracts in `tests/rules/`.

Do not commit personal Firebase settings, service accounts, `.env*` files, builds, dependencies, or generated reports. Use synthetic data/images for tests. Update documentation and the lockfile when changing commands, configuration, or dependencies.

Dependency overrides are intentional and documented in `docs/DEPENDENCIES.md`. Do not remove them without running the audit and compatibility tests. A project-wide license must be established before accepting public contributions under defined distribution terms.
