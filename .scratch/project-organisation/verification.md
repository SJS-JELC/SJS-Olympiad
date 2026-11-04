# Local acceptance ? 2 November 2026

## Delivered

- app/ is the existing application Git repository under its permanent name.
- Root guidance describes the current application; historical instructions are archived.
- Research, event resources, administration and communications have distinct locations.
- Plans and tickets are versioned in app/.scratch/, with current status separate from research and deployment claims.
- Browser acceptance scenarios use real sign-in and the current teacher/draft workflows.
- Deployment requires reusable validation of the same workflow event revision.
- Question restoration/reconciliation has one production implementation shared with test adapters.
- Generic chemistry engine copies are deterministic and checked; local preview owns a reusable memory-storage adapter.

## Evidence

| Check | Result |
| --- | --- |
| Rename preservation | All 524 tracked paths matched the pre-move hashes/deletion state |
| Git history/integrity | Original HEAD dd2a6687ac904407950e4cf143fc3d215e252444 retained; git fsck passed |
| Archived original source | SHA-256 matches retained asset manifest: c5364a6e8a3b1632a594dbcc0f80ce9884f15218f59736debc89c5a723851b90 |
| Server tests | 129 passed |
| Unit tests | 529 passed |
| Node contract tests | 9 passed |
| Final full browser run | 226 passed, 6.1 minutes |
| Typecheck, typography, production build, private-code gate | Passed |
| Both derived engine copies | Exact-byte check passed; originals unchanged |
| Local preview | Availability and teacher login passed on temporary loopback port 5189; process stopped |
| Root/index links and obsolete root references | Checked |
| Independent review | No blocking issues |
| Whitespace/diff check | Passed |

The final browser run followed all runtime refactors and the practical navigation fix. Earlier failed checks and their corrections remain described in the task answers; the final run is the integrated acceptance result.

## Additional fixes discovered

Windows reports some synced source files as links. The old local-tooling inventory skipped them and removed them from its mirror; the collector now checks real file metadata, rejects links outside the app and refuses an incomplete package inventory. Generated folders and TypeScript cache were moved to preserved local backups.

A stale practical navigation alert could cover the Theory button after successful retry/discard. The alert now clears when saved state is restored; real pointer-navigation tests verify recovery while failed-save guards remain.

## Limits and remaining work

No commit, push, deployment or live Azure validation was performed. GitHub workflow changes were reviewed locally; hosted workflow execution remains unverified.

The pre-existing dependency lockfile is unchanged. npm audit reported test-tool findings requiring review; see ../dependency-review/spec.md. Do not infer production exploitability from the audit count or apply a major upgrade without its own validation.

Baseline patches/hashes and full test logs are temporary local evidence, not a new documentation archive. Original working-tree edits and deletions were preserved. Retained source manifests keep historical identifiers; docs/source-provenance.md maps them to current archive locations.
