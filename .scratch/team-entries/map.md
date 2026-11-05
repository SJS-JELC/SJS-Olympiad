# Fresh event teams and batch administration

## Notes

[Plan](spec.md); [implementation](issues/01-implementation.md).

## Decisions-so-far

Local execution, no delegation. User confirmed permanent schools and fresh teams per event; no reusable catalogue/migration. Removal retains event results and revokes access. Restoration is explicit within that event. Settings batches team actions and Excel imports through durable API jobs.

## Fog

[Implementation resolved](issues/01-implementation.md): focused backend/browser checks and production build passed. Azure runtime acceptance is outside this local task.
