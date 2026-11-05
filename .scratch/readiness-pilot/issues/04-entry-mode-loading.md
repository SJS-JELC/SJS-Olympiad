# Avoid competition login flashing before pilot mode loads

Type: task
Status: resolved

## Answer

Handled locally without delegation. The unknown pilot snapshot previously supplied `pilot=false` while `checking=true`, but AccessGate still rendered the competition PIN. Pupil entry now stays unmounted during this initial lookup. The logo, progress indicator and teacher sign-in remain available. The confirmed response reveals the appropriate pupil entry; lookup failure retains the existing Retry action. Competition availability requests wait until pilot mode is known to be off. No stored mode hint or authentication changes were introduced.

Updated AccessGate and the readiness guide. Added browser cases with a held pilot response for both modes, lookup failure/retry and teacher sign-in during failure.

## Verification

Typography and Git whitespace checks pass. Browser tests/build were not run: this session's earlier tooling setup established missing cached dependencies and blocked registry access. CI must run the new `pilot-loading.spec.ts` cases alongside existing entry/pilot tests. No commit, push or deployment performed.

## Validation follow-up: 5 November 2026

The earlier dependency blocker is resolved. [Push-readiness verification](../../push-readiness/issues/01-validation.md) records passing build/audits, unit, contract, API and targeted browser checks, including the affected cases here. Earlier unverified local checks are superseded by that evidence; hosted CI and deployment remain unverified.
