# Fresh event teams and batch administration

Authorised 5 November 2026. Execute locally without delegation. No commit, push, deployment or live-data mutation.

## Confirmed model

Schools persist across events. Selecting an existing school and target count creates fresh random team IDs linked to that school and selected event. No reusable team catalogue or migration. Existing history stays intact. Removing a team retains its results and revokes device access; explicit restoration in that same event recovers the same ID/results. New event setup never restores an old event's teams.

## Plan

1. Preserve event-specific allocation and fresh IDs; replace the unshipped catalogue proposal.
2. Add request-bound, revision-guarded remove/restore operations. Keep legacy destructive delete API compatibility. Completed events stay read-only.
3. Finish authenticated bounded batch APIs with durable per-item checkpoints, limited concurrency and partial retries. Use one browser request and one refresh for bulk actions/import.
4. Add removed-team restoration controls; update current guides and domain records.
5. Check event isolation, removal/restoration, stale sessions/retries, partial failures and browser request counts, then relevant regressions and build.

## Acceptance

Schools and colours are shared; new events receive fresh teams and blank results. Removed teams retain history but cannot be claimed or scored; restoration never revives old device access. Batch retries cannot undo later actions. No cross-partition atomicity claim. Local verification does not establish cloud acceptance.
