# Readiness pilot

## Notes

Implementation authorised in conversation. No deployment or live-data changes.

## Decisions-so-far

- [Local resume and school tile](issues/05-resume-school-tile.md): confirmed local attempts bypass school selection and server re-entry after GO; question shows the selector-style school tile bottom right. Static checks pass; browser regression added but tooling remains blocked.

- [Entry mode loading](issues/04-entry-mode-loading.md): pupil entry stays hidden until the server confirms the mode, avoiding the competition PIN flash. Teacher access remains available; browser verification awaits CI.

Shared school directory; unlimited pilot entries independent of competition teams. C₅H₈; reject any invalid component; duplicates count once; best score and tied ranks. Same-browser persistence. Permanent close.

[Implementation](issues/01-implementation.md) completed locally with [recorded verification](verification.md).

## Fog

Typecheck/build/browser checks need the complete local tooling environment. School-device performance and live Azure acceptance remain unverified.
