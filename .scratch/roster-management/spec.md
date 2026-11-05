# School deletion and bulk team actions

Authorised 5 November 2026. Execute locally without delegation. Preserve existing uncommitted work. No commit, deployment or live-data operation.

Add selected-school deletion and per-team/select-all checkboxes with bulk Delete and Allow reselection. Completed event rosters remain read-only. Bulk operations reuse per-team authority, deletion retention and conditional writes, with frozen request IDs, explicit partial progress and safe retries. Draft team deletion remains immediate; active deletion and all releases require confirmation. School deletion requires unfinished teams to be deleted first, protects the host and retains historical identity and reserved names. Include the user-selected paste-from-Excel import: validate/preview school, target count and one/two colours; create/update sequentially with partial retries and no automatic team deletions.

Validation: focused API race/auth/idempotency cases, roster browser success/failure/retry checks, existing relevant regressions, typecheck/build/audits. Do not broaden to the full browser suite without a new reason.
