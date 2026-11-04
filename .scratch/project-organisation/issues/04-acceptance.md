# Repair acceptance scenarios and release validation
Status: resolved
Type: task
Blocked by: 03

Update obsolete teacher-navigation scenarios in problem-testing.spec.ts and settings.spec.ts while preserving useful preview/history coverage. Review draft-event tests against durable claims and current timing rules. Make deployment require the chosen validation set for the same revision, preserving PR preview and close behaviour. Keep live Azure acceptance separate. Do not push or deploy during this task.

Acceptance: affected browser and security regressions, typecheck and build pass; workflow structure prevents release ahead of required checks; unexecuted GitHub/cloud behaviour is explicitly recorded. Static contradictions are not described as observed runtime failures.

## Comments

## Answer

Updated stale teacher entry/navigation, durable-event and presentation expectations without bypassing authentication. Full browser discovery: 216/226; affected rerun: 51/52; last countdown case passed after allowing the UI sampling interval. All ten original failures passed. A real stale practical navigation alert was fixed and its retry/discard pointer paths passed. Server 129, unit 524, contract 9, typecheck/build/private checks passed. Deployment now needs reusable validation for the same revision; GitHub/live cloud execution not performed. Final integrated browser run follows refactors.
