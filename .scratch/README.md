# Current work

This is the application's versioned work tracker. Paths below are relative to this directory. Research drafts remain outside the app in ../../research/ and do not authorise implementation.

| Priority | Effort | Authority/status | Next step |
| --- | --- | --- | --- |
| Complete locally | [API performance and storage redesign](api-performance/spec.md) | Implemented, verified and independently reviewed; deployment/reset separate | [Acceptance and measurements](api-performance/verification.md) |
| Complete locally | [Cumulene depiction](cumulene-depiction/spec.md) | Central-carbon dot and simple linear cleanup implemented; validation limited | [Checks and crowding limitation](cumulene-depiction/issues/01-implementation.md) |
| Complete locally | [Roster and delivery cleanup](roster-cleanup/spec.md) | Implemented, verified and independently reviewed | [Acceptance](roster-cleanup/issues/03-implementation.md) |
| Complete locally | [Fresh event teams and batch API](team-entries/spec.md) | Implemented and verified locally | [Verification](team-entries/issues/01-implementation.md) |
| Complete locally | [School deletion, bulk teams and Excel import](roster-management/spec.md) | Implemented and verified locally | [Changes, tests and limits](roster-management/issues/01-implementation.md) |
| Ready locally | [Push readiness](push-readiness/spec.md) | Build/audits and required local suites pass; 105 targeted browser cases verified | [Evidence and limitations](push-readiness/issues/01-validation.md) |
| Complete locally | [School-coloured selectors](school-selector/spec.md) | Implemented; first-paint follow-up has limited validation | [Original verification](school-selector/issues/01-implementation.md); [first-paint fix and limits](school-selector/issues/02-first-paint.md) |
| Complete locally | [Settings roster layout](roster-layout/spec.md) | Flat columns and optimistic draft deletion verified locally | [Verification](roster-layout/issues/01-implement.md) |
| CI follow-up | [Faster deployment validation](deployment-validation/spec.md) | Smaller browser gate implemented locally; hosted verification pending | [Scope and checks](deployment-validation/issues/01-smoke-suite.md); [Oryx download fix](deployment-validation/issues/02-oryx-download.md); full suite retained for PR/manual runs |
| CI follow-up | [Protected question content](protected-question-content/final-delivery.md) | Integrated and pushed by user; full CI exposed browser regressions; local corrections await CI | [Browser corrections and limits](protected-question-content/issues/13-ci-browser-regressions.md); deployed acceptance remains separate |
| Complete locally | [Readiness pilot](readiness-pilot/spec.md) | Implemented; local-resume follow-up has limited validation | [Original verification](readiness-pilot/verification.md); [local resume and school tile](readiness-pilot/issues/05-resume-school-tile.md); not deployed |
| Complete | [Schools and numbered teams](school-teams/spec.md) | Implemented locally; validation limited | [Root review complete](school-teams/issues/02-review.md); [159 backend tests/static checks passed](school-teams/verification.md), full types/build/browser blocked; no deployment authorised |
| Complete | [U5P2 oxygen centre](u5p2-oxygen-centre/spec.md) | Completed locally; validation limited | Direct marker/lifecycle checks passed; build/browser checks blocked; not deployed |
| Complete | [Cut and Shut skeletal](cut-and-shut-skeletal/spec.md) | Completed locally | Skeletal products/editor validated; not deployed |
| Complete | [Double Trouble](double-trouble/spec.md) | Completed locally | U5P7 grouping, two marks; not deployed |
| Complete | [Cut and Shut level 3](cut-and-shut-level3/spec.md) | Completed locally | U5P9, three marks; not deployed |
| Complete | [U5P4 heterocyclic naming](u5p4/spec.md) | Completed locally | Validated; not deployed |
| Complete | [Project organisation and architecture](project-organisation/spec.md) | Completed locally | [Verification](project-organisation/verification.md); no deployment performed |
| Complete | [Research cleanup](research-cleanup/spec.md) | Completed | Unused drafts and diagrams retained; implemented research removed |
| Follow-up | [Test-tool dependency review](dependency-review/spec.md) | Proposed; major upgrade not authorised | Assess audit findings and migration |
| Deferred | [Deployment acceptance](deployment-acceptance/spec.md) | Evidence/rollout work deferred; no deployment authorised | Establish deployed revision and acceptance evidence before rollout |
| External | Masters school-account authentication | Owned by the separate Masters project; awaiting school IT per last recorded decision | Reconfirm there before scheduling dependent work |

## Task states

Each effort has a spec and numbered issues. Tasks use open, claimed or resolved; record dependencies as Blocked by. Choose the lowest-numbered open, unblocked task. A resolved ticket includes its answer and verification, with unrun/cloud checks explicit.

Current guides describe implemented behaviour; specs describe intended work. Link rather than duplicate those descriptions. Research remains provisional until a feature is authorised.


Loading work: [Entry and challenge preload](loading-preload/spec.md).

Handoff ready: [Fast confirmed question checking](question-check-speed/spec.md) — selected CHECK protection removals, five-read/one-transaction pipeline, diagram and [implementation ticket](question-check-speed/issues/01-implementation.md). Implementation remains pending.
