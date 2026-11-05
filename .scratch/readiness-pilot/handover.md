# Pilot handover — home testing

## Current position

Implemented locally; **not deployed**. The public website will not show these changes until a separately authorised deployment. Preserve the existing uncommitted school/team work alongside the pilot changes.

The pilot uses the shared school directory, with unlimited numbered entries per school, completely separate from competition teams. Pupils draw C₅H₈ isomers; valid duplicates count once, while any invalid component rejects the whole submission. Entries retain their personal best. Drawings and attempt recovery stay in the same browser.

## Start at home

From `app/`, with Node 24 and the normal local tooling available:

```powershell
node scripts/local-tooling.mjs setup
node scripts/local-tooling.mjs typecheck
node scripts/local-tooling.mjs build
node scripts/local-tooling.mjs test:browser
node scripts/local-tooling.mjs local-preview
```

Use the loopback URL printed by local preview. Its backend is in memory and clears when stopped; it does not use live storage. Sign in as teacher, open **Settings → Readiness pilot → Open pilot**, then reload to enter as a pupil. Add any synthetic test schools through the existing school controls.

## Quick manual checklist

- Select a school and **LOCK IN** without a pupil PIN or fullscreen.
- Submit pent-1-yne: expect one point and the first school entry number. Add cyclopentene: expect two points on the same entry.
- Add a duplicate: no extra point. Add a stray carbon or wrong-formula molecule: reject the whole submission, retaining the previous best.
- Refresh and reopen the same browser: drawing and entry resume. **Start new attempt** asks for confirmation and creates a new numbered entry on its first accepted submission.
- Check top three, own rank, full leaderboard and manual refresh. The board should not poll automatically.
- Exercise pan, zoom, fit, cleanup and undo on a large canvas. The 50-structure browser test still needs to run.
- Check teacher readiness counts, including rejected submissions. Check another-tab changes block stale editing until reload.
- **Test closure last, in local preview only:** switching to competition permanently closes that pilot. An already-open pupil page must fail its next submission and return to competition entry. Restart local preview for a fresh test backend.

## Verification and next work

Passed: 167-test backend suite, followed by all 10 focused pilot tests; typography and chemistry-engine sync checks.

Outstanding: typecheck, build/private-bundle audit and browser tests. These were blocked here by missing frontend dependencies and an unwritable external tooling mirror. Fix any failures at home before release. School-device performance, school-network access and Azure runtime acceptance remain unverified.

Main implementation: `api/src/pilot.mjs`, `src/pilot/Pilot.tsx`, plus HTTP/service routing and the teacher panel. Tests: `api/tests/pilot.test.mjs` and `tests/browser/pilot.spec.ts`.

See [verification details](verification.md) and the [pilot guide](../../docs/readiness-pilot.md). No live reset or deployment is part of this handover.
