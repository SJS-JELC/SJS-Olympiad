# Fresh event teams and reversible removal

Schools persist across events; teams are created afresh from a selected school and target count. There is no reusable team catalogue or separate cross-event team identity. This clarifies ADR 0002: a team ID is permanent within its event, while a later event starts with new IDs and empty results. Existing gameplay partitions and historical IDs need no migration.

Settings removes teams reversibly, retaining all results and revoking device claims. Explicit restoration recovers the same event team without restoring its old device access. This supersedes ADR 0004's use of destructive deletion in Settings; the legacy team-delete API keeps its existing retention/cleanup contract. Removed teams keep their numbers reserved. Completed events remain read-only, and year reset continues to reset gameplay rather than carry removed teams into the replacement namespace.

Removal changes the team and its request receipt atomically. Restoration of linked teams uses the school allocation journal to fence school deletion and enforce the current-team limit; entry revisions and request-bound plans prevent stale replay. Bulk actions/imports use durable API jobs with bounded concurrency and per-item results. Cross-partition changes cannot be one storage transaction, so retries resume completed progress rather than rolling it back.
