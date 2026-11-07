# Pre-optimisation local baseline

Captured 2026-11-07 using `node scripts/api-benchmark.mjs`, before storage/roster changes. This is an in-memory workload with **2ms requested delay per repository call**, not real Azure latency. Host scheduling makes elapsed times approximate. No Azure attempts.

50 synthetic schools, 200 teams, 100 separate authenticated pupil sessions. Roster removal includes the old three-request frontend readback. Shared authentication/rate-limiting operations are included.

| Scenario | Elapsed ms | Gets | Writes | Batches | Lists | Unpartitioned lists | Rows returned |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Entry (initial pilot config) | 20.05 | 3 | 1 | 0 | 0 | 0 | 0 |
| Leaderboard | 63.38 | 3 | 0 | 0 | 1 | 1 | 200 |
| Question | 140.00 | 10 | 1 | 0 | 0 | 0 | 0 |
| Hydrate | 95.67 | 5 | 1 | 0 | 1 | 0 | 0 |
| Practical | 84.07 | 6 | 1 | 0 | 0 | 0 | 0 |
| Remove through complete roster | 216.24 | 17 | 1 | 1 | 4 | 4 | 650 |
| 100 concurrent question reads | 116.56 | 1000 | 100 | 0 | 0 | 0 | 0 |

These are single controlled samples, not latency percentiles. Stable operation counts are the useful baseline. A first attempted concurrency fixture incorrectly shared one session; it hit expected counter contention and was corrected to distinct sessions before this run.

## Final local comparison

2026-11-07, same workload and requested 2ms delay. Removal including complete roster readback uses 8 gets, 1 write, 1 batch and 2 partition/range lists: **12 calls vs 23**, **250 returned rows vs 650**, and **zero unpartitioned lists vs four**. Browser verification confirms one POST instead of a POST plus three GETs. One final elapsed sample was 143.47ms vs the original 216.24ms; host scheduling and concurrent validation make this unsuitable as a hosted latency claim.

Leaderboard retains 3 gets and 1 list, now constrained to the event summary range. Entry, question, hydration and practical counts remain unchanged in this workload. Question's ten gets retain rate limiting, session/team ownership, current event membership and post-load authorisation checks. Request-local reuse applies only to safe repeated settings/directory reads; writes, conflict retries and final readback invalidate or bypass it. The 100 concurrent pupil requests still complete with 1,000 gets and 100 rate-limit writes; this is correctness/local concurrency evidence, not Azure capacity evidence.
