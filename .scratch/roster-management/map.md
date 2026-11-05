# Roster management

## Notes

[Scope](spec.md); [implementation](issues/01-implementation.md).

## Decisions-so-far

Local execution. User selected Excel paste import. School deletion uses the proposed noncascading default; history and names remain reserved. Bulk reselection uses per-team request receipts to avoid releasing a new claim on retry.

## Fog

Local validation passed: 76 API and 35 targeted browser cases plus build/audits. Hosted acceptance remains unverified.

[Implementation and verification](issues/01-implementation.md) is complete locally.

[Deleted-name reuse](issues/02-restore-deleted-school.md): Create school and import restore the original school identity, with replay-safe receipts and retained history/number reservations. Verified locally.
