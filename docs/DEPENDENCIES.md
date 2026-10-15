# Dependency remediation

Reviewed on 2026-10-15. The previous snapshot reported 15 vulnerable dependency nodes. After remediation, `npm audit` reports **zero vulnerabilities across production and development dependencies**. No audit exceptions, severity filters, or omitted development packages are used.

## Changes

| Dependency path | Remediation |
| --- | --- |
| HTTP proxy → micromatch → braces | Removed `http-proxy-middleware`; replaced the simple read-only catalog forwarding with Node fetch and explicit method/origin/type/size/timeout controls |
| Firebase CLI → chokidar → braces | Scoped CLI override to Chokidar 4, removing the brace/glob parser from this path |
| Firebase SDK → Firestore → gRPC | Scoped Firestore override to `@grpc/grpc-js` 1.14.6 or a later compatible 1.x version |
| Firebase CLI → PubSub → OpenTelemetry | Scoped PubSub override to core 2.12.0 or a later compatible 2.x version |
| Firebase CLI → gaxios → uuid | Scoped gaxios override to uuid 11.1.1 or a later compatible 11.x version with CommonJS `v4` support |
| Express/other consumers → qs | Override to patched qs 6.16.1 or a later compatible 6.x version |

The npm registry had no patched braces release during the review, so that dependency was removed from the installed graph. `npm audit fix --force` was not used.

## Compatibility and limits

Chokidar 4 changes glob handling compared with 3. This project uses Firebase Auth and Firestore emulators and watches a literal rules-file path, which has a dedicated compatibility test. The override does not certify unrelated Firebase CLI workflows such as Cloud Functions with glob-based ignore settings. See the [Chokidar migration notes](https://github.com/paulmillr/chokidar#upgrading).

OpenTelemetry 2 is a major upgrade; its required runtime is covered by Node 24. The PubSub path used by the CLI loads `W3CTraceContextPropagator`; a smoke test constructs the SDK with the override. Other PubSub workloads are outside this app's scope. See the [OpenTelemetry migration guide](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md).

Additional checks cover gaxios multipart-boundary creation, Firestore emulator operations using the overridden gRPC client, HTTP proxy failures and limits, typechecking, build, and browser flows.

The exact resolutions are pinned in `package-lock.json`. Overrides should be removed when upstream packages accept safe versions, after the full tests and audit pass. The CI runs `npm run audit:security` so future advisories fail the security check rather than being silently ignored.

The current machine-readable snapshot is [npm-audit-2026-10-15.json](npm-audit-2026-10-15.json). Re-run the audit when installing or releasing; a zero result describes the advisories known at the time of that query, not a guarantee about all security properties.
