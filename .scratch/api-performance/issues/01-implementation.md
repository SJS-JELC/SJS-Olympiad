# Implement API performance plan

Type: task
Status: resolved

## Work

Implement approved spec in staged ownership; preserve existing work. Record tests and limitations, and independent review disposition before resolving.

## Answer

Implemented and verified locally. See [verification](../verification.md), [measurements](../baseline.md) and [independent review](../review.md). All 316 distinct browser cases verified across the full run and targeted corrections; API 312, unit 599, contracts 22 and operator tests 8 pass. Build and whitespace checks pass. No deployment or live reset; Azure investigation remains 12/50 attempts with cleanup verified.

## Comments

- PERF-01: backend telemetry delegated to one worker; root owns browser instrumentation, tooling and integration. No cloud calls authorised to workers.
- 2026-11-07 10:27 UTC: PERF-01 worker passed 17 focused tests and 79 regressions (3 overlap), including 100 concurrent traces and mocked SDK transport retries/pages. Root reviewed HTTP/storage/service timing diff; accepted for integration.
- 2026-11-07 10:32 UTC: PERF-02 assigned to same direct worker: event partition/ranges, runtime manifest, roster envelope, asynchronous hashing and pilot reset epoch. Root implemented client contract, reset tooling and client/operator tests. Azure sample used 12/50 attempts; probe cleanup verified. Root tests: 6 client timing/roster, 5 reset/budget and 12 molecule UI cases passed. Typecheck passes after preserving an existing immutable graph test's intent using an immutable update.
- 2026-11-07 10:45 UTC: root integration: 599 unit tests, 22 contract tests, 8 focused roster/timing browser tests and 44 pilot/settings/school browser cases pass; full frontend build and protected/typography/type checks pass. Controlled removal counts drop from 23 to 12 repository calls, broad queries from 4 to 0, returned rows from 650 to 250; final benchmark remains pending backend request-cache audit. Operator reset/budget tests now 8/8, including lost committed responses. Installed SDK batch delete ignores per-row ETags: operator uses real direct conditional deletes, and runtime cleanup retains explicit transaction fences. No additional Azure calls.
- 2026-11-07 10:53 UTC: PERF-02 accepted for integration: 312/312 API tests pass, including real SDK conditional deletes, atomic deletion fences and external event-change post-read rejection. Fresh independent reviewer Descartes (PERF-03) started, inherited model/high reasoning, read-only source scope; root continues full browser regression and evidence. Reset/budget tests 8/8 pass; rendered timing panel inspected without horizontal overflow. Final removal count remains 12 vs 23. No cloud calls or deployment/reset.
- 2026-11-07 10:59 UTC: PERF-03 independent review accepted (33 focused checks; no actionable findings). Full browser run: 314 passes and two stale assertions; both corrected cases pass targeted reruns. Local acceptance recorded in verification.md; all four delivery stages complete. Root preserves pre-existing work and separate question-check-speed tracker. No deployment/reset; Azure remains 12/50 attempts.
