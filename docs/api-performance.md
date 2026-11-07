# API performance and maintenance

## Timing

After reproducing a slow action, expand Backend settings, choose Refresh backend settings, then Copy performance report. This copies formatted JSON containing current browser request/action history (including correlation IDs) and the latest loaded instance performance snapshot, with its timestamp, route percentiles, phases, storage/page/row counts, transport attempts and conflicts. Copy makes no network request. It excludes settings, event/team/school records, credentials and request/response bodies. If clipboard permission fails, a selectable text box provides the same report for manual copying. Paste the report when requesting performance analysis.

Backend settings includes a teacher-only timing view. Browser history holds the latest 100 API requests and roster actions in page memory. Refresh timing view makes no network request; Refresh backend settings obtains an authenticated, no-store diagnostic snapshot. Server summaries cover only the latest 256 requests on the responding instance, not the entire deployment. There is no diagnostics polling or telemetry write to Table Storage.

Browser elapsed time includes response consumption. `Server-Timing` exposes safe server durations; `X-Request-Id` links the response to allowlisted structured logs. Storage operations, pages, rows, transaction sizes, conflicts and HTTP attempts are separate metrics. Parallel durations overlap, so summed storage time is not wall-clock time. Initialisation and first requests should be compared separately from warm requests. Never add request bodies, raw keys, tokens, scientific content or arbitrary error objects to logs.

The consolidated `GET roster?eventId=...` returns schools, setup progress, active teams and removed teams. Roster mutations accept `rosterEventId` and preserve their result fields while adding `roster: {status:'complete', snapshot}` or `{status:'failed', error}`. The latter means the mutation response was received but readback failed; refresh the roster, do not issue a new mutation ID. A lost response remains uncertain and uses the original frozen request ID/payload.

## Local measurements

`node scripts/local-tooling.mjs api-benchmark` uses only in-memory storage: 50 synthetic schools, 200 teams and 100 distinct pupil sessions. `BENCHMARK_STORAGE_DELAY_MS` controls simulated per-operation delay (default 2ms). It reports timings and repository counts, not Azure capacity.

`node scripts/local-tooling.mjs azure-performance-probe` uses the existing local Azure CLI login. Credentials are captured internally, never displayed. It creates only a uniquely named probe and deletes it afterwards. The persistent initial-investigation ledger enforces 50 Table HTTP attempts across runs, disables retries and reserves cleanup capacity. After an interruption, use the same command with `--cleanup` to remove only the tracked synthetic probe. Do not delete/reset the ledger to obtain more allowance. Management-plane account/key lookups are not Table requests. Current measurement evidence is in `.scratch/api-performance/`.

## Offline developer reset

**Do not run reset as part of ordinary tests or deployment.** Obtain separate reset authorisation and ensure the app is idle, with no other users or in-flight work. Existing application instances must be quiescent; the maintenance marker alone cannot stop requests already in flight in old code.

Commands use the existing account/table, not an arbitrary target:

```text
node scripts/local-tooling.mjs storage-admin preview --max-attempts N
node scripts/local-tooling.mjs storage-admin reset --plan UUID --confirm sjsolympiaddata/OlympiadPilot --app-idle --max-attempts N
```

Replace N with the separately approved request budget and UUID with the preview ID. Preview reports counts and the exact target. Operator journals live outside the synced project under the local tooling storage-admin directory; they contain keys, ETags and preservation fingerprints, not configuration values or account credentials. Keep this directory private.

Reset preserves the school directory (including host identity, colours and deleted-name reservations), access-code configuration and pilot on/off. It clears events, teams, results, claims, sessions, previews, batches, allocation history and pilot entries/history. It does not delete/recreate the Azure table. Missing access codes or unknown settings fields stop the operation rather than inventing defaults or silently losing configuration.

The reset publishes maintenance, conditionally deletes records, rebuilds the minimal configuration and verifies preservation before publishing the compatible layout. The installed SDK's batch-delete helper drops per-row ETags, so maintenance uses direct conditional deletes and previews their request count rather than claiming conditional batching. Repeat the same reset command/journal after an interrupted run; the operation re-enumerates remaining records and rejects unexpected writes. Review/authorise the new run's bounded budget first. If a process crash leaves a local lock, verify no operator process is still running before removing that exact lock file. Never restart the app while reset verification remains incomplete.

Pilot mode may remain on with no event schools after reset. The pilot uses the shared directory and active/latest draft event roster; it has no separate school catalogue. Create an event and add schools before pilot entry is available.

## Cutover

The new physical layout is incompatible with legacy gameplay rows. Prepare and validate locally, then separately approve deployment/reset in a maintenance window. Preserve configuration using the operator tool; do not migrate disposable gameplay or enable legacy bootstrap. Local checks and direct-storage samples do not prove deployed acceptance.
