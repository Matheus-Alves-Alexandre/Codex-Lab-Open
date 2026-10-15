# Security

Report suspected vulnerabilities through GitHub's private vulnerability reporting feature if enabled, or contact the repository maintainer. Avoid publishing credentials or working exploits in public issues.

Include the affected commit, minimal reproduction, expected behavior, impact, and redacted evidence. Use demo accounts and projects.

Firebase web configuration is public; authorization depends on `firestore.rules`. Admin SDK credentials must never enter the frontend or `VITE_*` variables. Test rule changes in the emulator before deploying them to your own database.

The image proxy restricts origins, redirects, MIME types, response size, and time. The catalog proxy uses a fixed HTTPS origin, read-only methods, JSON responses, and response limits. Hosting-level quotas and rate limits remain necessary according to usage.

Run `npm run audit:security` to check production and development dependencies. Remediations and compatibility limits are documented in [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md).

The Quality workflow scans the complete reachable Git history with Gitleaks. It uses a pinned scanner version and verifies the download's SHA-256 checksum. A detected secret fails the job; there are no project-specific finding exclusions.

See [security_spec.md](security_spec.md) for tested data contracts and [docs/SECRET-AUDIT.md](docs/SECRET-AUDIT.md) for the local history reset. This clean checkout does not revoke credentials or erase content from a previous remote or deployment. Rotate/restrict previously exposed credentials at the provider as appropriate before using them again. Tests do not replace infrastructure review or verification of legacy data.
