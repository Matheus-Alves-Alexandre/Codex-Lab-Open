# Local capacity results — 2026-10-15

This snapshot comes from `npm run test:load:soak`, with 1,000 virtual clients. All nine scenario contracts passed. Baseline, cooldown and overload scenarios deliberately expect errors; those are not successful user journeys.

Environment: Windows x64, Node 24.22.0, AMD Ryzen 5 2600, 12 logical CPUs. The generator and isolated Express server ran on the same machine. The generator retained 1,000 persistent HTTP/1.1 connections with FIFO scheduling. The fixture simulated MangaDex JSON, 30 ms latency (800 ms in the slow case), five upstream starts per second and 40 chapter-server lookups per minute. No traffic was sent to real MangaDex or Firebase.

| Scenario | Client requests | HTTP outcomes | Request p95 | Upstream calls during measurement |
| --- | ---: | --- | ---: | ---: |
| Baseline without protection | 6,000 | 5 success; 5,995 rate-limited | 1,833 ms | 6,000 |
| Cold Home | 6,000 | All 200 | 1,896.2 ms | 6 |
| Warm Home | 6,000 | All 200 | 1,207.2 ms | 0 |
| Shared popular reader metadata | 10,000 | All 200 | 3,183.2 ms | 10 |
| Slow upstream | 6,000 | All 200 | 2,637.2 ms | 6 |
| Warm metadata during outage | 6,000 | All 200, stale fallback | 1,192.4 ms | 10 failed refresh attempts |
| Upstream 429 cooldown | 1,000 | 1 upstream 429; 999 controlled 503 | 410.2 ms | 1 |
| Unrelated search overload | 1,000 | 19 success; 981 controlled 503 | 393.7 ms | 19 |
| Warm Home, 60-second soak | 352,494 | All 200 | 26.5 ms | 6 |

Every protected scenario stayed at or below four upstream starts in any rolling second. Except for the intentional upstream-429 scenario, the protected gateway did not exceed the fixture's quotas. Health checks stayed successful during load. In the soak, health p95 was 28 ms, peak server RSS was 210.6 MiB, and exactly 1,000 client sockets were created and reused across the flow repetitions. The burst scenarios include connection establishment; the soak mostly reuses established connections.

The first soak attempts exposed two generator problems: Windows ephemeral-port exhaustion (`EADDRINUSE`) with Node's default idle-pool size, then idle-connection resets with the default LIFO pool strategy. Retaining the full pool and distributing requests with FIFO corrected the generator behavior. The final run did not retry, suppress or discard transport errors.

This establishes local behavior for repeated, shared catalog metadata. It does **not** establish 1,000 distinct uncached reading sessions, image delivery capacity, real Firestore usage, Google OAuth throughput, CDN effectiveness, Vercel multi-instance coordination or production hardware capacity. In particular, 981 of 1,000 unrelated cold searches were intentionally rejected to preserve availability and upstream limits.

The full machine-readable run is generated locally at `test-results/load/soak.json`; subsequent standard runs write `test-results/load/latest.json`. Both are ignored by Git. See [SCALING.md](SCALING.md) for test commands, safeguards, interpretation and the staging acceptance plan. This snapshot records local validation and is not evidence of a deployed production change.
