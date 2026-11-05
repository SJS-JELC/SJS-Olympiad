# 01 — Implement shared schools and durable numbered teams

Type: task
Status: resolved

## Scope

Implement the accepted [spec](../spec.md) across server storage/service/HTTP, teacher roster UI, domain guides and isolated synthetic regression coverage. Preserve existing uncommitted work, server gameplay authority, deletion lifecycle fences, Unicode and publication boundaries.

## Acceptance

Shared identity and derived names; 1–50 target semantics and defaults; four host teams per new event; no number reuse; manual legacy linking; grouped teacher roster; completed-roster restrictions; safe partial progress/retry/concurrency; preserved gameplay and year-reset metadata. Root reviews the integrated diff. Record executed and blocked checks separately.

## Comments

Implementation uses the existing per-team partitions and fences, with conditional directory/settings/allocation reservations in the system partition. Interrupted year-reset staging retains its validated request and blocks further edits until resumed.

## Answer

Implemented shared school identities, current-name projections, durable numbered roster setup, four-team host setup, manual legacy linking, grouped teacher results and metadata-preserving year resets. Existing individual claim, ranking and guarded deletion flows remain authoritative. Compatibility team creation now reserves unlinked names against concurrent school rename and releases those reservations only after the matching permanent deletion or successful link.

## Verification

Full isolated API regression: **159 passed**, including 13 new school/failure/concurrency cases. JavaScript syntax, changed TypeScript/TSX syntax, typography audit, chemistry-engine consistency, source-only private-marking boundary and Git whitespace checks passed. [Detailed evidence and limitations](../verification.md).

Complete project typecheck, production build and rendered browser tests could not run: the ordinary external tooling directory is write-restricted, and a safe TEMP mirror cannot install missing dependencies from the restricted registry. Browser cases were added and syntax checked. No live/cloud/deployment validation was performed. [02 — independent root review](02-review.md) remains open.
