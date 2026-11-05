# 0002: Shared schools and durable roster allocation

Status: accepted, 4 November 2026.

## Decision

Schools have permanent IDs and globally unique normalized names. The host school is identified by `isHostSchool`, independently of its editable name. Teams retain permanent IDs independent of display names and store `schoolId` and `teamNumber` when linked. Read projections derive the current school name plus number; no frozen name is introduced. School renames therefore affect all linked historical results and claimed-team snapshots on their next read.

Existing teams remain unlinked with their existing IDs, names and gameplay until a teacher explicitly links them to an unused number in an unfinished event. Completed rosters cannot be linked or expanded. Global school renaming remains available for completed results.

Each event/school allocation journal retains all allocated numbers, a high-water mark and request-bound setup plans. A target count between 1 and 50 creates only the missing current teams. Ordinary defaults are two and the host default is four; staff may change either target. Reductions use the existing individual deletion tools and confirmations. Numbers are never reused after either permanent deletion or retained removal.

Every newly created event records its creation request and a pending four-team host setup before creating teams. Retry or Resume finishes that same setup. Activation requires completed setup. Existing event reads never invent teams.

## Reason

Schools recur across events, while gameplay belongs to permanent team identities. Names must remain editable without changing claims, scores, clocks or keys. Number reservations must survive deletion and uncertain network responses.

The Azure repository permits atomic transactions only inside one partition. A school’s teams deliberately remain in their separate existing gameplay partitions. A multi-team setup is therefore a resumable operation with explicit partial progress, rather than an all-or-nothing transaction or destructive rollback.

## Consequences

The school directory, allocation journals and their conditional reservation writes live in the `system` partition. Reserving a plan also fences current settings and the school directory, preventing concurrent year-reset staging or renaming from bypassing the observed roster/name validation. Each generated team and lifecycle fence still commit atomically in that team's partition. Completion fences remain after deletion, preventing replay resurrection. A failed conflicting legacy link retains its number reservation but releases its unfinished operation.

Confirmed year resets retain team IDs, school metadata and historical number reservations while resetting gameplay. A durable settings fence prevents further roster changes during staging. An old-team ETag fence decides races with deletions already in flight: a winning deletion is omitted, while a losing deletion cannot commit against the retired snapshot. The validated reset input is retained until publication so staff can resume after failure or reload. Invalid input is rejected before taking that fence. Retired namespaces remain inaccessible through the current event catalogue.

School names are trimmed, whitespace-collapsed and limited to 70 characters. Name uniqueness uses NFKC, case folding and straight/curly apostrophe equivalence. The limit leaves room for the separator and allocated number. Legacy names remain compatible; collisions with reserved school-team names are rejected.

No cloud configuration, live data reset, migration of personal records or publication is part of this decision. Local validation does not establish Azure acceptance.
