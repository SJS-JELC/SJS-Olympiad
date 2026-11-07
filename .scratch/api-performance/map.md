# API performance implementation

## Decisions

- Approved plan in spec.md; one event partition, no sharding machinery.
- Same table cutover; retained-record exceptions where atomicity requires them.
- Pilot school choices already derive the current event's roster and shared directory.
- Pilot mode survives reset; pilot history/credentials do not.

## Starting worktree

Pre-existing edits: .scratch/README.md, .scratch/readiness-pilot/map.md, docs/readiness-pilot.md, docs/u5p7-mark-scheme.md, src/chemistry/molecule/depiction.ts, src/chemistry/molecule/layout.ts, src/components/molecule/MoleculeEditor.tsx, src/components/molecule/Structure.tsx, src/components/molecule/molecule.css, src/pilot/Pilot.tsx, tests/unit/molecule-editor-engine.test.ts, tests/unit/molecule-editor-ui.test.ts; untracked .scratch/cumulene-depiction/ and .scratch/readiness-pilot/issues/06-pilot-palette.md.

## Work

- [Implementation and verification](issues/01-implementation.md)

## Decisions-so-far

- [Copy performance report](issues/02-copy-report.md) implemented and verified locally; copies browser history plus detailed instance metrics without making a request. Deployment pending.

- [Local implementation accepted](issues/01-implementation.md): measurements and full validation in [verification.md](verification.md); independent review passed. Deployment/reset and hosted latency acceptance remain separate.

## Fog

Small direct-storage sample captured in azure-sample.md; local baseline in baseline.md. No deployment/reset executed. Initial Azure investigation budget remaining: 38 attempts (12 used, probe cleanup verified).
