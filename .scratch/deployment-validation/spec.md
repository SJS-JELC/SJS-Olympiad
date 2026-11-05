# Faster deployment validation

Status: Implemented locally; hosted verification pending.

## Authority and scope

User requested reduced deployment-test time. Execute locally without delegation. Keep mandatory API, unit, contract, production build and public-content audits. Reduce the browser selection on main pushes; keep full browser validation for pull requests and manual runs. No deployment or push is part of this task.

## Delivery

See [implementation and validation](issues/01-smoke-suite.md). The explicit smoke configuration inherits the existing Playwright behavior and contains twelve complete boundary/entry suites. The full suite remains the default local command. Catalogue-wide parity and per-question/editor layout cases are outside the reduced gate; changes in those areas and pre-event acceptance still need full validation.
