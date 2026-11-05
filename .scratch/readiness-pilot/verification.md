# Current verification: pilot redesign (4 November 2026)

## Skeletal formula explanation

Reworded the prompt, removed the question-mark icon and added centred small-copy help with butane/C4H10 and cyclohexane/C6H12 diagrams. These illustrate notation without supplying C5H8 answers. Build passed; rendered expanded help at 1920x1080 and 1024x768, with accessible examples and Submit remaining visible. On smaller screens the question pane scrolls while help is expanded.

## Funny Bones layout refinement

Removed the school identity and idle storage message, revised the prompt, centred the help disclosure, expanded the drawing area, and moved the three-place medal leaderboard beside Submit. Standard build passed; real-browser navigation, disclosure and rendered checks passed at 1920x1080 and 1024x768.

## Teacher code timeout

Added a ten-second incorrect-code timeout and full speech-bubble liquid background using the game wave/bubble animation. Input and arrow disable until the deadline; close/reopen does not reset it; operational errors remain retryable. Standard build and three focused entry browser tests passed, including timed recovery and transport failure. No backend authentication/rate-limit changes.

## Landing refinement

Narrowed landing GO without stretching its lettering, replaced welcome copy with the requested larger black text, vertically centred the group, and replaced bubble GO with an inline > plus top-right close cross. Checked desktop/1024px renders and real HTTP arrow sign-in/close focus. Standard build passed. Updated affected teacher-sign-in selectors; no backend changes.

## Passed

- Standard external-cache build: engine synchronisation, typography audit, TypeScript, Vite production build and private marking boundary all passed. Vite retains its existing large-chunk advisory.
- Full API regression run: 169/169 passed. Two additional pilot race/ranking tests subsequently passed with the complete focused pilot suite (12/12); 171 distinct backend cases are therefore covered across these runs.
- Browser selection: 44/46 initially passed. The two failures were test assumptions (zoom-out already at its minimum, and switching mode before entry's refresh completed). Corrected the tests to zoom in first and wait for entry readiness. All five pilot browser tests then passed, completing all 46 selected scenarios across runs. Security/entry/settings coverage includes authentication, fullscreen, interruption, reload, stale operations and recovery.
- Rendered Funny Bones at 1920x1080, 2560x1440 and 1024x768; checked landing/eagle bubble at desktop and smaller landscape sizes. Screenshots remain in the external tooling cache, not source.
- Real HTTP preview on port 5174: teacher eagle sign-in, on toggle, pilot welcome, school selection, access registration before marking, rejected empty submission, and teacher report readback passed. Pilot remains on for user review; port 5173's older backend/data was not reset.
- Existing score/claim operations remain unchanged. No server-stored drawing or raw credential; public rankings contain names/positions only. Concurrent entry, lost responses, off fencing entry and submissions, reversible mode, school filtering and distinct-school tie ordering covered by backend tests.

## Limitations

- No deployment, Azure runtime/storage acceptance, school-network access or school-device acceptance claimed.
- Full browser suite was not run; the focused 46-scenario set covers the changed flows and relevant security/settings boundaries.
- Git whitespace check retains the pre-existing trailing blank line at `.scratch/README.md:25`; unrelated whitespace was left intact.

## Changed areas

- Pilot service and HTTP/service dispatch; pilot entry, settings, persistent drawing flow and styles.
- Landing access gate and new landing styles; optional four-digit CodePanels mode; title-only shared QuestionShell; router integration.
- Pilot/API and relevant browser fixtures/regressions; pilot/API guides, app instructions, glossary and tracker.

---

## Earlier implementation evidence (superseded limitations below)

# Verification

## Passed

- `node --test --test-isolation=none api/tests/*.test.mjs`: 167/167 passed after the initial eight pilot tests, covering existing authentication, claims, schools, event lifecycle, timing, scoring, retention and storage contracts.
- `node --test --test-isolation=none api/tests/pilot.test.mjs`: 10/10 passed after adding persistence-failure/restart and mode retry/authorization cases, and again after raising the pilot-only body ceiling to accommodate explicit hydrogen drawings (120 KB graph / 128 KB request; competition remains 64 KB).
- `node scripts/check-typography.mjs`: passed.
- `node scripts/sync-chemistry-engines.mjs --check`: passed. Maintained source and server copy match; competition defaults remain 20 heavy / 100 total atoms / 150 bonds.
- Fifty disconnected five-carbon structures passed server marking/capacity checks (roughly 5–8 ms for the tested repeated-structure fixture locally). This is not a browser benchmark or an exhaustive molecular-isomer enumeration.
- Static review: all pilot writes share the closure ETag fence; no competition roster allocation, gameplay, scores or claims participate. Raw drawings and credentials do not appear in server rows. Existing uncommitted school-team work preserved.

## Blocked / not established

- Repository-standard `node scripts/local-tooling.mjs typecheck` failed with EPERM while creating the readiness-pilot folder in the external tooling mirror. Frontend dependencies (including TypeScript/Vite) are absent from the inspected source/mirror installation. No dependency files were installed inside synced source.
- Source private-boundary checker could not import `typescript`. Typecheck, build, bundle boundary and browser tests therefore remain unrun, not passing.
- Default Node test process isolation failed with spawn EPERM; the supported single-process runner above completed successfully.
- Git whitespace check reports a pre-existing trailing blank line at `.scratch/README.md:25` and line-ending warnings on existing modified files; no unrelated whitespace cleanup performed.
- Three Playwright scenarios were added for local recovery/frozen retries/new entries/no polling; 50-structure rendering/zoom/cleanup/submission; and cross-tab protection/closure. They need execution with complete dependencies and Chromium before release, alongside existing access/settings regression tests.
- No school-device visual/performance verification, live Azure acceptance or deployment performed.

## Changed areas

- New backend `api/src/pilot.mjs`, service and HTTP dispatch, generated molecule engine limits.
- New pupil/teacher UI in `src/pilot/`, routing in `src/main.tsx`, teacher panel in `src/App.tsx`, maintained molecule-core limit ceiling.
- Pilot backend/browser tests, `docs/readiness-pilot.md`, API/agent guidance and tracker records.
