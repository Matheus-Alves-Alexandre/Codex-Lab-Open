# Clean-source and Git-history verification — 2026-10-15

## Scope

The maintainer explicitly authorized deleting this checkout's old Git directory and initializing a fresh repository for the open-source version. The scope is the local `Codex-Lab` project, its publication files, and its new Git objects. The parent workspace repository, previous GitHub repository, cloud accounts, and deployments are outside the reset.

Protected assets: provider credentials, personal Firebase configuration, private account data, and source integrity. The main failure modes are accidentally retaining old Git objects/references, adding ignored credential files to the initial commit, publishing generated artifacts, or treating a clean local scan as credential revocation.

## Result

- The previous local `.git` directory was removed rather than copied into the new repository.
- The clean source has one new root commit on `main` and no parent commits. At the reset it had no remote; the publication destination is the new `Matheus-Alves-Alexandre/Codex-Lab-Open` repository. The private original repository is separate.
- Gitleaks 8.30.1 scanned the new staged source and complete reachable history with default rules, full redaction, and no baselines or project-specific finding exclusions: **no findings in the scanned scope**.
- The legacy Firebase configuration file is absent. Environment files, Firebase aliases, service accounts, and common private-key formats are ignored. Only `.env.example` contains empty or synthetic settings.
- The initial commit excludes dependencies, downloaded tools, generated builds/reports, and local environments.
- SHA-256 comparison confirmed that all 77 application/configuration/script/test files match the previously validated runtime. No application behavior was changed by the history reset.
- Git object/ref checks confirmed no old commit objects or additional references in the newly initialized repository.

Exact checks: `git rev-list --all --count`, `git rev-list --parents --all`, `git remote -v`, `git for-each-ref`, `git fsck --full --no-reflogs --unreachable`, staged-file inventory, Gitleaks staged scan, and Gitleaks `--all --full-history` scan. Machine-specific logs and the resulting commit SHA remain in the ignored `.tools/security-audit/` workspace.

## Prevention

The CI secret job fetches full history and runs Gitleaks over all reachable commits. It downloads version 8.30.1 from the official release and checks a pinned SHA-256 checksum before execution. A finding fails the job. The CI job has read-only repository permissions and does not deploy the site.

The application starts in catalog-only mode unless someone supplies their own Firebase configuration. `npm run setup:firebase` creates a local ignored `.env.local`; it does not upload credentials, create cloud resources, or deploy rules. See [FIREBASE.md](FIREBASE.md).

## Previous remote and credential status

The old remote had a Google API key in its historical Firebase configuration and an AI Studio app link. This reset removes those old local commits; it does not erase the old GitHub repository, its forks/caches, an existing deployment, or the provider's credential. Publication is to a separate new public repository; the original remains private, and no credential was revoked.

The original repository's GitHub APIs reported secret scanning and Dependabot disabled, and code scanning not enabled. Those responses are not evidence that the old remote is free of alerts or exposures. No remote alert or setting was changed.

The old key's permitted APIs, validity, usage, and deployed Firebase rules were not verified. Review and restrict/rotate it at the provider where needed. Never reuse an exposed key for a secret non-Firebase service merely because it is absent from this new source history.

## Verification limits

This is a credential/configuration and local Git reset check, not a new full application penetration test. It reuses the earlier 214 passing application/rule/browser tests only for files whose hashes remained unchanged. The new CI shell script was syntax-checked locally; its hosted execution still requires pushing to a chosen destination.

The scan does not certify arbitrary cloud settings, binary image contents, inaccessible third-party history, or credential validity. No source or detected credential was sent to a third-party scanner. The previous report/archive are retained only as ignored local audit artifacts and are not part of the initial commit.
