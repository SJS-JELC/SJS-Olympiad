# Reduce browser work on routine main pushes

Type: task
Status: resolved

## Answer

- Added an explicit twelve-file deployment browser configuration and `test:browser:smoke` command, including support in the external local-tooling wrapper.
- Reusable validation accepts a boolean `full_browser` defaulting to true for both callable and manual runs. The deployment caller requests smoke on main pushes and full coverage on PRs.
- Retained all backend, frontend unit and contract suites. Production build/typecheck/typography/private-content audits now run before browsers; removed the redundant standalone typecheck because build already runs it.
- Kept deployment dependent on successful validation; no timeout/retry relaxation, dynamic failure exclusions, dependency upgrade or cloud changes.
- Updated README, Azure guide and the existing workflow contract in AGENTS.md.

## Verification and limitations

Static checks verify JSON parsing, every selected spec path, unique selection and the twelve-file suite size; Git whitespace and local-tooling syntax checks pass. Reviewed workflow branches against GitHub's boolean input semantics and configuration inheritance against Playwright documentation.

No fresh Playwright enumeration, browser run, build or hosted Actions execution: local dependencies remain unavailable and registry access is blocked in this session. The reduction is in selected browser files, not a measured time saving. Full validation remains necessary to confirm the recent CI regression repairs, including editor viewport tests outside this smoke suite.

References: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax and https://playwright.dev/docs/api/class-testconfig.

## Validation follow-up: 5 November 2026

The earlier dependency blocker is resolved. [Push-readiness verification](../../push-readiness/issues/01-validation.md) records passing build/audits, unit, contract, API and targeted browser checks, including the affected cases here. Earlier unverified local checks are superseded by that evidence; hosted CI and deployment remain unverified.
