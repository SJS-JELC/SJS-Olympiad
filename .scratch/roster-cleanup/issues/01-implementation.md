# Roster state and recovery

Type: task
Status: resolved

Follow [approved spec](../spec.md).

## Answer

Stable useRosterController owns frozen school/team commands, result/readback distinction, exact retries and complete roster snapshots. All child forms use it; optimistic hiding and independent parent team read removed. Root-level status survives empty lists. Busy requests lock event selection, late results ignored, typed fields preserved. Initial-events generation guard added after independent review found a stale read could replace a newer saved event; regression checks name and next revision.

Initial type/build checks passed; integrated results in ticket 03.
