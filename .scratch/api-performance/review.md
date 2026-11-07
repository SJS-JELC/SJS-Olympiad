# PERF-03 independent review

Date: 2026-11-07

Disposition: **PASS within the scope below.** No actionable implementation or security findings identified. This is not deployment/reset acceptance or a blanket assertion about the application.

## Authority and scope

Independent sequential reviewer under the authorised root-plus-one-worker plan, inherited model/high effort, with no subdelegation. Root retains integration, fixes and final acceptance. Read-only review except this evidence file; no source edits, dependency installation, cloud requests, deployment or real reset.

Read workspace/app AGENTS.md, tracker conventions, `.scratch/api-performance/{spec,map,access-audit,baseline}.md`, implementation ticket, `docs/api-performance.md` and ADR 0006. Reviewed the current performance implementation against the spec and applicable security/storage contracts. Excluded the pre-existing chemistry palette/cumulene changes recorded in map.md; Pilot.tsx review was limited to reset epoch and request behavior.

Inspected backend storage/layout/request-cache/service/school/pilot paths, HTTP/telemetry/diagnostics/password handling, operator reset and request-budget scripts, client request timings, roster controller and its callers, pilot epoch handling, and focused regression tests. Staffing remains local to this reviewer; the review skill's default parallel reviewers were superseded by the explicit no-subdelegation assignment.

## Standards and security assessment

No actionable findings in the inspected boundaries:

- **Request cache:** only `system/settings` and `system/schools` are reused within a request, with cloned results. Sessions, team ownership, gameplay, receipts and layout are not cached. Writes invalidate before and after settlement, including failure; conflict retries invalidate again. `ownedTeam`, post-read presentation/question checks and final roster readback explicitly use fresh reads. Accepted-event settings in question mutations remain an explicit existing operation contract, rather than an accidental cross-request cache.
- **Storage isolation and cleanup:** event summary and delimiter-terminated team ranges isolate neighboring IDs and event namespaces; broad runtime list calls are rejected. Team/state/receipt commits share the event partition. Physical cleanup updates its lifecycle marker conditionally in the same transaction as removals; final marker/receipt completion and summary removal are atomic. Reviewed the school-link cleanup's journal fence as the other batch-delete caller.
- **SDK boundary:** inspected installed `@azure/data-tables` 13.3.2 source. Its submitTransaction delete branch omits per-row delete options while its update branch passes update options. The repository therefore rejects delete batches without an explicit same-batch conditional update; operator reset uses direct `deleteEntity(...,{etag})`. The memory adapter is stricter about delete-row ETags, so memory tests alone are not evidence of Azure delete serialization.
- **Manifest:** Azure request dispatch checks a compatible, non-maintenance layout before operations and shares that check only within the request. Missing settings in Azure do not invoke fixture bootstrap. Runtime does not create the table. Requests already in flight are outside the maintenance marker's guarantee, matching the documented idle-app requirement.
- **Telemetry:** server actions/phases/methods are code-owned allowlists; correlation IDs are generated, not supplied by callers. Logs and instance summaries project counters/durations without keys, payloads, credentials or error text. Histories are bounded and detached. Browser timing captures response consumption for JSON and binary paths and strips query parameters. Diagnostics remain teacher-authorized and no-store; no telemetry Table writes were found.

## Spec assessment

No actionable findings in the inspected behavior:

- **Reset:** preview binds target, discarded keys/ETags and retained fingerprints. Reset validates preserved configuration, publishes maintenance, re-enumerates on resume, rejects unexpected disposable writes, conditionally removes history, rebuilds minimal configuration and verifies preservation before publishing the layout. School directory/deleted-name reservations are retained, code hashes are preserved, unknown settings fail closed, pilot on/off survives and a stable journal-owned reset epoch invalidates old pilot identity. Inspection included interrupted writes and lost committed-delete/final-publication responses.
- **Pilot:** bootstrap/report expose the epoch; enter/submit check it before old identity/receipt reuse and again on retries. Config participates in write transactions to fence mode changes. Client epoch changes remount and replace saved identity/results/pending submission while retaining the local drawing; server records do not retain drawings.
- **Roster:** mutations omit redundant legacy team readback when the consolidated envelope is requested. Final readback is fresh and produces a complete snapshot or a separate failure envelope without changing a confirmed mutation into an uncertain result. Client applies a snapshot together, keeps old rows while saving, blocks mutations after stale readback, and uses GET-only refresh after confirmed-write/readback failure. Uncertain retries retain frozen payload/request ID; departed-view results are generation-guarded. Partial batch retry behavior remains distinct.
- **Performance claims:** the baseline explicitly distinguishes stable operation-count reductions from simulated local timings and hosted capacity. No cloud latency/capacity acceptance is inferred from these changes.

## Independent verification

Focused checks executed by this reviewer:

| Location | Check | Result |
| --- | --- | --- |
| Source workspace | `node --test api/tests/request-cache.test.mjs scripts/storage-reset.test.mjs` (included in the initial combined command) | 9 tests passed |
| Source workspace | `node --test api/tests/storage.test.mjs api/tests/memory-storage.test.mjs` | 6 tests passed |
| Existing external validation worktree | `node --test api/tests/performance-layout.test.mjs api/tests/telemetry.test.mjs` | 18 tests passed |

**33 focused tests passed.** The first source-workspace attempt to load performance-layout failed before its tests ran: Windows returned EPERM reading `api/src/presentation/registry.mjs`. To resolve that validation gap without modifying or syncing the external worktree, compared hashes of service, request-cache, storage, schools, layout, pilot and telemetry modules plus both external test files; all nine matched the reviewed source. Then ran only the two existing, in-memory Node test suites there. No browser server, dependencies, source or generated output were changed there.

The focused cases cover prefix-neighbor/event isolation, guarded cleanup, manifest rejection, post-read authorization after an external event-end write, pilot epoch changes during retries, fresh consolidated roster traversal, confirmed writes with failed readback, concurrent telemetry isolation, sensitive-value exclusion and bounded history.

## Limitations and final ownership

- Git could not read HEAD's loose object because of a filesystem permission error. This is a content/spec review of the recorded implementation scope, not a complete Git-diff attribution audit. Some unrelated source/assets also denied reads; they were not needed for the focused boundaries above.
- The reported 312-test API pass and root's broader unit/build/browser results are root evidence, not rerun or independently claimed here. Root is correcting two existing browser assertions concerning L5P9 preload request counting and practical closure; those test edits are outside this review.
- Client state/epoch paths were statically reviewed with their tests; this reviewer did not run a browser or repeat root's full suite. Final browser acceptance remains with root.
- Reset verification used injected clients only. Actual Azure conditional transactions, transport behavior, restart/maintenance operation, deployment and hosted performance remain unverified here. No Azure request was made.

Only this review evidence file was written by PERF-03. No fixes requested; root should retain the outstanding integration and deployment boundaries above.
