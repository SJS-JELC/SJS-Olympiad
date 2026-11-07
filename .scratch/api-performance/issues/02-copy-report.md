# Copy performance report

Type: task
Status: resolved

## Answer

Added Copy performance report to the teacher API performance panel. Copies formatted JSON with current browser request/action history and the latest loaded instance performance snapshot, including timestamp, percentiles, phases, storage counts/pages/rows, HTTP attempts and conflicts. Copy performs no network request. Explicit projection omits diagnostic configuration, event/school/team records and arbitrary fields; browser histories already omit bodies, credentials and query parameters. Clipboard rejection exposes a read-only selectable fallback.

Implementation: `src/cloud/performance-report.ts`, `src/components/ApiPerformance.tsx` and snapshot wiring in `BackendDiagnostics.tsx`. Usage documented in `docs/api-performance.md`.

Verification: four focused browser tests pass, covering copy contents, privacy, no extra request, fallback selection and existing timing/roster behavior. Production build, typecheck, typography and protected/private/derived-engine audits pass. Diff whitespace check passes. No Azure requests or deployment performed for this task; changes remain local.
