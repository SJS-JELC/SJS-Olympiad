# Implement roster management

Type: task
Status: resolved

## Answer

Added selected-school deletion with confirmation, retained historical identity/name/colours, protected host and atomic directory/settings guards. Schools with unfinished teams or incomplete allocation plans cannot be deleted. Deleted names stay reserved and deleted schools cannot receive new teams or colour/name edits.

Added row/select-all checkboxes and bulk Delete/Allow reselection. Draft deletion remains immediate; active deletion and reselection confirm selected names. Each team uses its original request payload, partial progress remains visible, and retries skip confirmed operations. Single and bulk reselection now use per-team atomic receipts and expected claim generations, protecting a new claim after a lost response. Legacy no-request-ID API callers remain supported.

Added the requested Excel-paste importer with optional header, normalized matching, duplicate/count/hex validation, preview and explicit Apply. Existing school colours update; only missing teams are added. Lower targets never delete teams. Uncertain steps retain their request IDs, with retry and stop controls. Generated dependencies/output stay in the external tooling mirror.

Files: SchoolRoster.tsx, new TeamBulkActions.tsx, SchoolImport.tsx and school-import.ts; Settings CSS and API types; schools/service/http/pilot backend integration; focused API/browser tests; schools/API guides, glossary, ADR 0004 and current AGENTS contract.

## Verification: 5 November 2026

- 76 focused API cases passed: roster-management (5), school colours, schools, team deletion, service/auth/security, pilot and draft roster.
- 35 distinct focused browser cases pass across final runs: 6 new roster/import cases, 27 existing Settings/school-team cases and 2 lifecycle cases. New cases verify lost school deletion responses, bulk partial failures, new-claim safety on release retry, Excel import retries/lower targets, validation without writes, selection reset, active confirmation and completed-event restrictions.
- Production build, TypeScript, typography, chemistry-engine and private/protected-content audits passed. Final TypeScript/typography checks passed after the last test/help-text edits.
- Visually inspected the generated Settings import-preview screenshot; controls and table remain legible and within the existing scrolling layout.
- Git diff whitespace check passed.

## Limits

No commit, push, deployment or live-data mutation. Full browser/unit suites were not rerun: validation was scoped to changed boundaries. Pending bulk/import plans are page-local; completed server changes persist on stop/reload, and interrupted allocation plans retain the existing Resume path. Existing development-tool audit findings and bundle-size warning are unchanged. Hosted/Azure acceptance remains separate.
