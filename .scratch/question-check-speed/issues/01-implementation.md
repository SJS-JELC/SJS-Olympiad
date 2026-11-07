# Implement the agreed CHECK pipeline

Type: task
Status: open
Blocked by: none

Implement [the handoff specification](../spec.md) against the current event-partition working tree. User-selected removals apply to CHECK, not every API endpoint. Do not start by rewriting storage or undoing existing performance work.

Deliver: a measured five-read/one-transaction warm competitor path, parallel read groups, pure ordinary marking overlapped with I/O, retained transaction/replay/security correctness, safe timing evidence and updated guides. Complete all verification and independent review described in the spec. Preserve the explicit admission-snapshot policy and externally drained maintenance requirement.

No implementation, benchmark, deployment or live data modification was performed while preparing this ticket. Git HEAD access was unavailable during planning; preserve existing files and resolve repository access separately if it blocks implementation checks.
