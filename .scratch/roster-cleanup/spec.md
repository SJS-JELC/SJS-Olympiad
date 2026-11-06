# Roster and delivery cleanup

Authorised user plan, 5 November 2026. Preserve pending Oryx changes. No publication/live data changes.

## Outcomes

All school/team mutations wait for server confirmation. One stable roster controller owns frozen requests, acknowledgement, refresh recovery and atomic schools/teams/removed/progress snapshots. No optimistic row hiding. Confirmation wording and form values remain local. Exact retries preserve receipts; partial retry reuses entire batch. Successful save plus failed read offers read-only retry. Busy requests lock event switching, settled failures permit navigation but mutations require refreshed data. Page-local retry state and late-response guards remain.

Browser fixtures reuse existing memory adapter, preserving transport/fault helpers. Validation uploads built dist after all checks; deployment downloads exact artifact ID and prepares Node22 API dependencies, skipping Oryx. No duplicate frontend build.

## Delegation

Root acceptance; one foreman; two parallel gpt-6.1-sol/high workers (roster, infrastructure), maximum four active including root. Workers cannot spawn. Foreman owns mirror sync/integration/docs. Independent sol/high review after workers finish, one correction cycle then root reassessment. Milestones implementation50%, validation30%, review/docs20%. No new staffing without root revision.

## Gates

Focused roster/storage then full Chromium suite because shared fixture changed; full backend/unit/contracts, build/audits. Independent integrated review. Hosted artifact/deployment acceptance remains separate.
