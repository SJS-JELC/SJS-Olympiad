# Local verification — schools and teams

Recorded 4 November 2026. Implementation worker evidence; root review remains a separate acceptance gate.

## Passed

- `node --test --test-isolation=none --test-reporter=dot api/tests/*.test.mjs` — **159 tests passed**, exit 0. Node subprocess-isolated execution is unavailable (`spawn EPERM`); the same deployable modules and isolated memory repositories ran in-process.
- Thirteen new backend cases cover event/school creation retry, normalized uniqueness, editable target semantics, no number reuse, preserved gameplay, partial storage failure, concurrent retry, deletion replay without resurrection, claimed/history/leaderboard rename, year-reset metadata, teacher authorization/privacy/HTTP dispatch, conflicting concurrent links, interrupted year-reset resume after service recycling, host rename and legacy-name/rename races.
- `node --check` for `api/src/service.mjs`, `api/src/schools.mjs`, `api/src/http.mjs`.
- TypeScript compiler `transpileModule(..., reportDiagnostics:true)` syntax checks for `src/App.tsx`, `src/components/SchoolRoster.tsx`, `src/cloud/api.ts`, `tests/browser/settings.spec.ts`, `tests/browser/school-teams.spec.ts`, using the already installed VS Code TypeScript compiler. This checks syntax/transpilation, **not full project types**.
- `scripts/check-private-boundary.mjs --source-only` — passed using a Node module-resolution hook to the same installed compiler; no dependency copies were written into the synced source.
- `node scripts/check-typography.mjs` — passed.
- `node scripts/sync-chemistry-engines.mjs --check` — passed.
- `git diff --check` — passed. Git emitted only existing repository line-ending conversion warnings.

## Blocked or unrun

- `node scripts/local-tooling.mjs typecheck` could not initialize its usual external tooling directory: `EPERM` creating `C:/Users/jelc/AppData/Local/SJS-Olympiad-Security-PoC`.
- Running the existing local-tooling setup with `LOCALAPPDATA` redirected for that process to TEMP successfully mirrored source outside the synced folder. Dependency setup then failed with `ENOTCACHED` for `yallist`; the existing user npm cache also lacked the package. A bounded normal fetch returned `ECONNREFUSED` through the configured restricted proxy. No proxy or global configuration was changed.
- Full project typecheck, production Vite build/production private-bundle gate and Playwright execution remain blocked by those missing dependencies. The four new browser cases and adjusted existing Settings coverage are present and syntax checked; they have **not** been rendered/executed.
- No live Azure reads/writes, reset, migration, deployment, publication or cloud configuration changes were performed. Local checks do not establish live acceptance.

## Changed files

| Area | Files |
| --- | --- |
| Server | `api/src/schools.mjs`, `api/src/service.mjs`, `api/src/http.mjs` |
| Frontend | `src/components/SchoolRoster.tsx`, `src/App.tsx`, `src/cloud/api.ts`, `src/settings.css` |
| Tests | `api/tests/schools.test.mjs`, `api/tests/diagnostics.test.mjs`, `api/tests/draft-roster.test.mjs`, `api/tests/event-draft.test.mjs`, `api/tests/hydration-lifecycle.test.mjs`, `api/tests/team-delete.test.mjs`, `tests/browser/school-teams.spec.ts`, `tests/browser/settings.spec.ts` |
| Guides/domain | `GLOSSARY.md`, `docs/adr/0002-school-identity-and-roster-allocation.md`, `docs/schools-and-teams.md`, `docs/api-contract.md`, `docs/azure-backend-pilot.md`, `README.md`, `AGENTS.md` |
| Preview | `scripts/local-preview.mjs` log and guides now describe four automatically generated host teams plus the three existing labelled test teams |
| Tracker | `.scratch/README.md` and `.scratch/school-teams/` spec, map, implementation/review tickets, verification and delegation log |

The initial Git working tree was clean. All changes above belong to this authorised implementation. No commit was created.
