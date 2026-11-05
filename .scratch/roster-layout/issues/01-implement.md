# Simplify the roster and make deletion responsive

Type: task
Status: resolved

## Answer

- One table body, separate School/Team columns and no school subheaders. Keep linked numeric ordering, unlinked original names, full accessible action names and existing school colour controls.
- Draft deletion starts on Delete without a warning. Hide the row before awaiting the request; reconcile against refreshed server data. On failure restore it; uncertain requests retain their frozen payload through the existing Retry control. Active events still confirm and hide on confirmation; completed events remain disabled.
- Empty practical results render a dash with no working disclosure or unnecessary label request. Partial responses remain accessible; final zero and original precision remain visible.
- Updated current guide and existing instruction wording; adapted school/settings browser expectations and added delayed-success/failure, stable retry and empty/zero practical cases.

## Verification

51 API tests passed across team-delete, draft-roster, practical and schools. Typography audit passed. Changed-file whitespace checks passed. Browser/typecheck/build execution remains unavailable because local dependencies are missing and registry access is blocked; browser cases are authored, not claimed passing. No push/deployment or live data changes.

## Validation follow-up: 5 November 2026

The earlier dependency blocker is resolved. [Push-readiness verification](../../push-readiness/issues/01-validation.md) records passing build/audits, unit, contract, API and targeted browser checks, including the affected cases here. Earlier unverified local checks are superseded by that evidence; hosted CI and deployment remain unverified.
