# Local implementation acceptance

Date: 2026-11-07

## Outcome

Implemented safe browser/server/storage timing, event-partition storage with scoped row ranges, consolidated roster responses, bounded asynchronous password work, request-local configuration reuse and an offline resumable development reset. No deployment or real reset was performed.

Single-team removal through complete roster readback now uses 12 repository calls instead of 23, two partition/range queries instead of four unpartitioned queries, and returns 250 rows instead of 650 in the 50-school/200-team fixture. Browser removal completes in one request instead of four. See baseline.md for timings and unchanged security-check counts; local timings are not hosted latency evidence.

CRUD of a known entity uses PartitionKey and RowKey. Collection reads use a required PartitionKey and bounded row ranges where applicable; they are not point reads. Operator maintenance intentionally enumerates the entire table. Runtime no longer performs unpartitioned discovery.

## Changed components

- `api/src/`: layout, repository ranges, telemetry/HTTP policy, service roster envelope, school/pilot isolation, manifest checks, password queue and request-local cache. API entrypoint passes logging context. API fixtures and regression suites updated.
- `src/cloud/{api,performance}.ts`, `src/components/{ApiPerformance,BackendDiagnostics,useRosterController}.tsx`: safe timings, instance summaries and one-response roster updates.
- `src/pilot/Pilot.tsx`: reset epoch invalidates old identity/results/pending submissions while preserving local drawing.
- `scripts/`: bounded Azure probe, reset preview/journal/conditional cleanup and local benchmark; external tooling installs API dependencies. Validation workflow includes SDK and operator tests.
- Guides, ADR 0006 and this tracker document the new layout and explicit maintenance cutover.

Pre-existing chemistry/palette changes remain intact. A pre-existing molecule UI test's immutable graph update was corrected for typechecking. Two older browser assertions were updated to match existing whole-year content preload and practical closure-to-landing behavior; production behavior was unchanged. A separately created `.scratch/question-check-speed/` effort was left untouched.

## Verification

| Check | Result |
| --- | --- |
| API suite | 312 passed, zero skipped |
| Unit suite | 599 passed across 39 files |
| Contract suite | 22 passed |
| Operator reset / persistent investigation budget | 8 passed |
| Full browser suite | 314 passed; two obsolete assertions corrected and each passed targeted rerun (316 distinct cases verified) |
| Production build | Passed, including typecheck, typography, derived-engine and protected/private boundary checks |
| Timing panel | Screenshot visually inspected; horizontal-overflow assertion passed |
| Independent PERF-03 review | PASS; 33 focused checks, no actionable findings; scope/limitations in review.md |
| Git diff whitespace check | Passed |

The first corrected practical test expected an absent property; the service intentionally returns null for blank responses. The final explicit null assertion passes. The entire browser suite was not rerun after these test-only corrections.

## Operational boundaries

Initial Azure investigation used 12 of the 50 permitted Table HTTP attempts; unique probe deleted and absence verified. 38 remain. No further cloud calls were needed. No secrets or real personal/team data were copied into source or evidence.

Validation used local Node 24 tooling; deployed Node 22 and hosted API performance remain unverified. Reviewer could not inspect Git HEAD because of filesystem permissions, but reviewed current scoped code and verified relevant source/external hashes; root inspected diffs with approved read access.

New runtime requires the explicit compatible layout and cannot read legacy gameplay rows. Deploy/reset requires a separately approved idle maintenance window. Reset preserves school directory, configured access-code hashes and pilot on/off while clearing deprecated/history records. Installed SDK batch deletes omit ETags, so operator cleanup uses direct conditional deletes; runtime batch cleanup requires a conditional lifecycle update in the same atomic transaction. Do not treat an in-flight request as stopped by the maintenance marker.
