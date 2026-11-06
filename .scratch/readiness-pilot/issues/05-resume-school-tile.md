# Resume without school selection and show school on the question

Type: task
Status: resolved

## Scope and plan

User authorised bypassing school selection for saved pilot attempts and showing the same school tile at the question's bottom right. GO remains on the welcome page. The user then explicitly authorised trusting the local confirmed session without another server resume check. First entry and submission remain server-backed. Preserve drawings, uncertain submissions, school eligibility and cross-tab guards. Reuse selector artwork/name formatting, update guidance, and check the affected flows.

Delegation: local execution for this bounded UI change. No deployment or live-data changes.

## Answer

Confirmed local attempts open the question after GO without pilot-enter. Local confirmation must match the saved school; current snapshot eligibility remains checked. Unconfirmed first entries retain server creation/retry and never flash the selector during recovery. Cross-tab save conflicts cannot activate a newly entered question.

The question's bottom row places the leaderboard left, Submit centrally and a noninteractive school tile right. Shared tile CSS, selected artwork and selectorName preserve selector styling and school colours.

Verification: typography audit and Git diff whitespace check passed. Added a browser regression that rejects any re-entry request, observes selector flashes and checks school identity. It is unrun: the existing tooling cache has no dependencies and the build attempt earlier in this session failed with EPERM when syncing outside the writable workspace. Typecheck, build and browser/rendered acceptance remain unverified. No deployment.
