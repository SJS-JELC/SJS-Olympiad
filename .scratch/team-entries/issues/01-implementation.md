# Implement fresh event teams and batch APIs

Type: task
Status: resolved

Follow the authorised spec; preserve current gameplay storage and complete focused regression and build gates.

## Answer

Implemented permanent shared schools with fresh generated team IDs per event. No catalogue or migration is needed. Added reversible event removal and explicit single/bulk restoration, retaining results and revoking device access. Linked restoration uses allocation fences and the 50-team limit; request/entry revisions prevent replay from undoing later changes. Existing destructive team-delete remains compatible.

Added durable authenticated teams-batch and schools-import API jobs, bounded payloads/concurrency, exact retry binding, per-item checkpoints and partial errors. Settings uses one mutation request and one refresh cycle per bulk job. Batch manifests store fingerprints/counts, avoiding duplication of potentially large input payloads. Added removed-team selection/restoration controls and current API, school, glossary and ADR guidance.

### Changed files

- Backend: api/src/admin-batches.mjs, service.mjs, schools.mjs, http.mjs.
- Settings: src/cloud/api.ts and components/SchoolRoster.tsx, TeamBulkActions.tsx, SchoolImport.tsx.
- Verification: api/tests/admin-batches.test.mjs, event-team-lifecycle.test.mjs; updated browser roster-management, school-teams and settings cases.
- Guidance: docs/api-contract.md, schools-and-teams.md, ADR 0005, GLOSSARY.md, AGENTS.md and this tracker.
- Earlier uncommitted deleted-school restoration work remains intact.

### Verification

53 focused backend tests passed across batching, event-team lifecycle, schools, roster management, legacy deletion, event-year/draft, hydration and storage. After final fixes, the 25 directly affected batch/lifecycle/school/roster cases passed again, including the maximum-school-count restoration guard. Three new domain integration cases and three batch cases cover real failure/concurrency boundaries; no broad new unit-test scaffolding.

35 affected Chromium browser checks passed (34 existing Settings/roster cases plus one new batch restoration/lost-response case). Production build, TypeScript, chemistry-engine sync, typography audit and private/protected presentation boundaries passed. git diff --check passed. Only isolated synthetic test data used.

Local completion only. No commit, push, deployment, cloud configuration or live-data changes. Azure runtime/storage acceptance and other browser engines remain unverified. Batch limits are 100 items and 48 KB; changes are individually atomic, not a cross-partition transaction. Retry controls remain page-local; after reload inspect results before starting a new job.
