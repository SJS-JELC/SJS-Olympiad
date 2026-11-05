# Repair browser regressions exposed by full CI

Type: task
Status: resolved

## Scope and findings

User reported 11 failing and 274 passing browser cases after pushing main. Work executed locally without delegation. No push or deployment performed.

- Diagnostics, current-event and editor comparison tests attempted to fill a teacher field that is now mounted only after opening the eagle sign-in bubble.
- The entry-code test also used the old GO label and attempted editing during the new ten-second incorrect-teacher-code timeout.
- The lifecycle test expected only its manually added team, omitting the four host teams automatically created for new events.
- The redesigned entry forms omitted the required form-level autocomplete suppression. Input-level password-manager hints were still present.

## Answer

Updated five browser test files to use the current entry interaction, submit label and timeout. Reused the existing teacher sign-in helper where authentication is setup. Kept masking, paste, invalid-state, diagnostics and layout assertions. The lifecycle case explicitly checks all five starting team names and compares every complete team record after the lifecycle transitions. Restored `autoComplete="off"` on both entry forms without changing authentication or content authorization.

## Verification and limits

- Direct production-service reproduction passed: all five complete roster records remain identical after draft → active → draft → ended.
- Six focused API tests passed across current-event, diagnostics and event-draft suites.
- Typography audit and Git whitespace check passed.
- Browser/typecheck/build rerun blocked before execution: isolated temporary local-tooling setup could not install uncached npm dependencies. Offline install returned ENOTCACHED; network attempt returned ECONNREFUSED through the restricted environment.
- The supplied CI summary and source inspection identify these causes; no new 11/11 browser pass is claimed. Full CI remains required, including the production build after browsers pass. Earlier delivery evidence covered an affected browser subset, not the full suite.

Focused rerun after dependency setup, from the external tooling mirror:

```powershell
npx playwright test tests/browser/access-code-fields.spec.ts tests/browser/backend-diagnostics.spec.ts tests/browser/current-event.spec.ts tests/browser/editor-comparison.spec.ts tests/browser/settings-lifecycle.spec.ts --workers=1
```

Run the complete CI workflow before accepting deployment. Local test fixes do not establish deployed acceptance.

## Validation follow-up: 5 November 2026

The earlier dependency blocker is resolved. [Push-readiness verification](../../push-readiness/issues/01-validation.md) records passing build/audits, unit, contract, API and targeted browser checks, including the affected cases here. Earlier unverified local checks are superseded by that evidence; hosted CI and deployment remain unverified.
