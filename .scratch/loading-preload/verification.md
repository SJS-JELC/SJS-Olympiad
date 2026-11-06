# Local verification

## Deployment-gate follow-up: passed locally

- Production build passed, including typography, engine consistency, typecheck, private-marking boundary and protected-presentation boundary.
- Full API suite: 288 passed.
- Full unit suite: 590 passed.
- Full contract suite: 22 passed.
- Main-push browser smoke suite: 69 passed using installed Edge. The four new loading-entry tests are now included in the smoke configuration.
- Git diff whitespace check passed.

The follow-up fixed stale competitor availability after a failed focus refresh: GO is disabled, an actionable error is shown, and teacher entry remains available. Protected-practical tests now permit early presentation reads while continuing to reject early/late saves. Browser tests cover the lightweight entry endpoint, background pilot fetching, claim-time preload, memory reuse, blob revocation/recovery, and late practical payloads crossing the deadline.

Changed implementation: src/pilot/Pilot.tsx. Changed validation: protected-practical API tests; pilot-loading, current-event, cloud-question, protected-content and protected-practical browser suites; playwright.smoke.config.ts. Existing unrelated work was preserved.

The actual initial splash was captured and inspected at 1920?1080. The smoke suite also passed protected-question/practical layout checks at 1200, 1920 and 2560 widths. Bundled Playwright Chromium was unavailable locally, so installed Edge was used.

No deployment, hosted GitHub Actions run or cloud latency measurement was performed. The complete PR browser suite was not run; this verifies the main-push validation selection locally, not hosted acceptance.
