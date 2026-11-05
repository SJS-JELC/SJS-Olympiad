# Implementation and delegation plan

Status: Planned; not executing.

Authority: user requested an exact implementation plan with delegation. This document refines [the specification](spec.md); it does not authorise deployment. The existing implementation ticket is the parent delivery ticket. On execution, materialise the jobs below as numbered child tickets using the local tracker conventions, without another design round unless new consequential decisions arise.

## Architecture to implement

### Public frontend and private presentation

Keep the existing React renderers, editors and interaction logic, but parameterise their confidential inputs. Do not replace bespoke chemistry views with a general HTML renderer. Separate the public catalogue (IDs, year, number, score metadata, neutral routing metadata and approved decorative headers) from typed server presentation records. Inventory titles and labels explicitly: public metadata must not contain the question prompt or scientific clues. Header decoration is an allowlist, not permission to publish arbitrary question assets.

Put presentation records and protected assets under a new server-owned presentation directory, separate from private marking modules. Use explicit keyed records and immutable asset identifiers, not user-controlled filesystem paths. Keep contracts in a data-free shared module that both sides can consume. Each record carries a schema/content version; validate its required fields and asset references during the build. Preserve scientific Unicode, source geometry, attribution and provenance. Source/reference files may stay in the repository where required, but must not be shipped publicly or imported into browser code.

Use a discriminated presentation type for each renderer's needs: prose, field labels, tables, structured molecule graphs, diagram references and example data. Never ship marker functions, expected answers, private recipes, or future timed-game revelations as presentation. Pilot Funny Bones stays an explicit public exception.

### API contract

Add read-only POST actions `question-content` and `practical-content` using the existing JSON/origin/session handling. Request: question ID for theory, optional event/catalogue context for teachers. Competitors derive their event from their owned team. Response: content ID, version, server time and typed presentation, with an asset manifest. These reads must not start timers, mutate attempts or allocate marks.

Add `content-asset` for protected binary/SVG delivery. Request includes content kind/ID, version and asset ID, plus teacher context where applicable. Resolve only an asset listed for that presentation version after the same authorization as content. Extend the HTTP adapter and local preview adapter to return actual bytes with an allowlisted MIME type, no-store and nosniff; do not base64-encode large images into JSON. Browser fetches create memory-only blob URLs for images. Reject unknown/version-mismatched identifiers and arbitrary paths. Audit trusted SVGs for active content/external references and render diagrams through image elements unless an interactive view needs explicitly typed geometry.

Factor a narrow content-authorization helper around existing service checks. It must verify session, role, team ownership, claim/security generation, event/year membership and the applicable server window. Use start-inclusive/end-exclusive checks for both draft and active competitors; teacher event/catalogue previews bypass timing but retain teacher authentication. Preserve event-ended and reset fences. Do not accidentally broaden existing access when reusing a helper.

Audit `start`, `resume`, `session`, `hydrate`, `question`, custom actions, practical reads/saves and result summaries. Bulk hydration becomes status-only for presentation purposes, including after opening: no unopened questions' protected custom data. Fetch authorized initial custom state for the selected question when needed, preserving timed-game reveal rules. Close draft timing bypasses on any alternate route that can reveal content; keep frontend countdowns consistent. Retain permitted read-only practical result access after close without returning a protected protocol through that path.

### Client lifecycle

Add a dedicated content store at the authenticated router/provider lifetime. Keep it separate from attempt/result reconciliation in `CloudQuestion`: `stateLoaded` is not `contentLoaded`. Load on route opening only, deduplicate an in-flight request, then load required protected assets. A repeat visit reuses successful content and blob URLs without content requests. Interactive data and marking actions retain their existing server semantics.

Key records by authenticated authority identity, event, content ID and version. Pin the successful version during that visit. Clear the applicable content cache and revoke URLs on logout, session expiry, lock, identity/team/event changes and window closure; recovery reauthorizes and reloads content. Abort outstanding fetches and reject stale responses using a captured authority generation and current timing gate. Abort is an optimization; response fencing is mandatory. Do not clear unrelated question answer working as a side effect of clearing presentation.

Provide accessible loading/failure/retry states in the existing question shell. Only mount actual content after state, content and security gates permit it. No localStorage, sessionStorage, IndexedDB or offline cache for presentation. No polling. Teacher previews use the same loader, removing current content-ready shortcuts. Practical content loading must not cause saves, lose unsaved edits or bypass its existing save/navigation protections.

## Delegation and capacity

Root retains final acceptance and consequential scope decisions. Exactly one foreman owns the queue, integration, evidence and child lifecycle. Children do not spawn agents.

| Role | Model / effort | Initial / maximum concurrent | Responsibility |
| --- | --- | --- | --- |
| Root | Current session model unchanged | 1 / 1 | Plan, user communication, final acceptance |
| Foreman | gpt-6.1-sol / high | 1 / 1 | Baseline, assignments, integration, evidence, progress |
| Implementers | gpt-6.1-sol / high | 1 / 3 | Bounded jobs below; fresh context per job |
| Standards reviewer | gpt-6.1-sol / high | 0 / 1 | Independent standards/architecture/security review |
| Spec reviewer | gpt-6.1-sol / high | 0 / 1 | Independent requirements, chemistry/visual parity and leakage review |

Maximum five active agents total: root + foreman + three implementers OR root + foreman + two reviewers. Reviewers run together only after implementation workers drain. This leaves 21 of the currently available 26 slots unused; capacity is not a target. Shared security work starts with one strong worker because a failed foundation would multiply migration rework. Parallelism is reserved for disjoint content migrations.

Allowed adaptation: reduce migration concurrency to one or two when shared seams, tooling contention or test contention warrant it. Foreman may reassign a job to a fresh worker of the same model/effort after one unsuccessful correction; after two substantive failed attempts, stop that job and escalate to root while independent work continues. Root may approve gpt-6-astra / high for one bounded difficult job within the same five-agent cap, recording the reason. More concurrency, changed deliverable/security policy or cloud work requires a revised plan. Never change the root model. Do not claim token savings without measurements.

## Work graph and ownership

| Job | Depends on | Owner and bounded delivery | Acceptance evidence |
| --- | --- | --- | --- |
| J01 Baseline and inventory | None | Foreman: preserve current working tree; inventory 35 registered theory IDs and 3 practicals, transitively referenced assets/data, public exceptions, all disclosure endpoints, current test commands and baseline failures. Pin review baseline and assign file ownership. | Inventory with classification, original hashes/text and per-question visual checklist; no changes lost. |
| J02 Representative secure slice | J01 | One foundation worker: shared contracts, content/asset API and authorization, client store/loading, state-versus-content split, hydration disclosure fixes, timing alignment; migrate L6P5 Twist and Bump with its SVG geometry and label JSON. Own all shared cloud/service/security/router/transport files. | Full request-to-render slice; direct access denial matrix, first-open/revisit/retry/race tests, scientific/visual parity. Contract frozen before migration jobs start. |
| J03 L5 migration | J02 | Worker: nine L5 question folders and their server presentation/assets/tests. Parameterise scientific views; keep approved header decoration static. Shared grouping changes requested from shared owner. | All nine inventoried, correct source/content IDs, focused tests and rendered checklist. |
| J04 U5 migration and pilot isolation | J02 | Worker: eight registered U5 questions, including legacy folder names such as double-trouble and u5p7; server records/assets/tests. Preserve drawing engines and pilot separation. | Eight real catalogue IDs, graph/label parity, editor and pilot regressions. |
| J05 Remaining L6 migration | J02 | Worker: other eight L6 questions; server records/assets/tests. Preserve timed oxyanion reveal and GC custom-data rules. | Eight inventoried; no future challenge data disclosed; timed/action/navigation regressions. |
| J06 U6 migration | J02 | Next available migration worker: nine U6 questions, NMR, diagrams, tables and server records/assets/tests. | Nine inventoried; interactive SVG/geometry parity, all migrated checks. |
| J07 Practical migration | J02 | Next available migration worker: practical catalogue/protocol/views and server records/assets/tests. Shared practical service changes stay with foundation/shared owner. | Three protocols protected by independent windows; teacher previews, saves, result-only access and deadline behaviour intact. |
| J08 Integration and public-build audit | J03–J07 | One integration worker: remove transitional content fallbacks/imports; final explicit server registry; extend build boundary checks; update guides, domain record if needed and tracker. Shared edits serialized. | Production build has no protected payloads/assets; import graph and emitted asset inspection; full selected regressions and all 38 rendered checks. |
| J09 Independent review | J08 | Two reviewers, Standards and Spec, fresh contexts, read-only. Fixed baseline, integrated diff, spec, inventory and evidence supplied by pointers. | Separate findings reports; verify scientific parity beyond automated checks; no self-review accepted as substitute. |
| J10 Fix and final acceptance | J09 | One worker fixes findings; relevant reviewer rechecks corrections. Foreman consolidates results, root accepts. | Required checks pass, every finding resolved or explicitly escalated, final changed-files/evidence/limitations report. |

Dispatch J03/J04/J05 first (maximum three). Refill with J06/J07 as slots free. No worker edits another worker's files. Migration workers add separately named presentation files; a single integrator owns shared registries, common grouping components and contract changes. If a new common abstraction is needed, pause affected workers, land it once and refresh their bases before proceeding.

## Workspace and integration safety

The current repository has substantial uncommitted prior work. Do not start worktrees from bare HEAD and thereby omit that work. Before implementation, capture a recoverable source-only snapshot and hash manifest including tracked modifications and required untracked app files, excluding credentials, personal records and generated/dependency output. Establish an isolated integration checkout from that exact snapshot; preserve the user's original working tree and Git history. Record an immutable baseline commit in the isolated checkout for review, without silently committing unrelated work into the user's branch. If isolation cannot preserve the baseline safely, escalate before edits.

Use one integration branch and per-job worktrees based on its accepted tip. Foreman integrates completed jobs serially, checks conflicts and records resulting commits. Use existing local-tooling workflows for dependencies/build output outside the synced source. Verify cache isolation before concurrent builds; serialize tooling that shares the external mirror. Do not let a worker overwrite the running preview mirror with another worktree's sources. Keep worktree cleanup scoped to recorded task-created paths and retain evidence until acceptance. No publishing, PR, deployment, storage reset or cloud configuration changes are part of this plan.

## Validation and acceptance

1. Baseline: record existing checks/failures and current source/assets; distinguish new failures from prior ones without waiving failures relevant to the change.
2. API matrix: anonymous/pilot/teacher/competitor; correct and wrong year/event/asset; before, exact start, exact end, after; draft and active; revoked/expired/stale-claim/locked; catalogue preview; invalid IDs/path traversal/version mismatch. Cover all alternate disclosures and confirm content reads never start timed questions or mutate scores.
3. Browser: first-open requests, zero repeat content requests, deduplication, failed-load retry, teacher previews, reload/logout, lock/recovery, cross-tab restrictions and stale-response races at deadline/context change. Verify blob cleanup and no persistent/offline content cache.
4. Behaviour: relevant full API suite and frontend contract/unit tests; targeted browser suites for timing, security, hydration, every bespoke question interaction, pilot and practical saving. Use independent accepted/rejected marking fixtures. Run standard build (engine sync check, typography, typecheck, Vite and boundary audit).
5. Confidentiality: dependency/import audit plus emitted JS/CSS/maps/assets/manifest scanning against the inventory, including normalized prompts, SVG/graph equivalents, accessible text and historical assets. No temporary static content fallback may survive J08. Keep legitimate public pilot content and decorative art explicitly exempted.
6. Parity: all 35 theory questions and three practicals checked against the baseline for visible text, diagrams, units, fields and interactions. Render at 1920x1080 and 2560x1440 with representative smaller-screen checks, preserving source attribution and geometry. Fix discrepancies rather than merely recording screenshots.
7. Size/load: record actual per-question payload and asset bytes, including compression measurements labelled as local. Exercise simultaneous first openings with synthetic local sessions at 25, 50 and 100 clients; report latency/errors and local limitations, not Azure capacity claims. Do not use real team records or live storage.
8. Independent Standards and Spec reviews inspect the integrated change. Fix findings and rerun affected checks; avoid repeating unaffected full suites without cause. Final root acceptance requires complete evidence and honest unresolved limitations.

## Progress and completion

Milestone weights for delivery reporting: baseline/inventory 10%, secure representative slice 25%, migrations 35% (weighted by inventoried content complexity rather than worker count), integration/verification 20%, independent review and fixes 10%. Mark milestones complete only with evidence.

Root creates the run log and transfers sole log ownership to the foreman. Foreman records job IDs, actual timestamps, commits, validations, failures/adaptations and five-minute internal snapshots; sends root milestone/blocker alerts and a compact snapshot every 15 minutes. Root waits without queue polling and reports completed milestones, current work, blockers, next step and evidenced percentage at the 15-minute deadlines. ETA remains unknown unless measurements support it. Stop scheduled reports at completion or an explicit handoff/blocker requiring user input.

Deliver an integration branch based on the preserved current app, completed tickets, inventory, updated current guides, verification and both review reports. State how to preview the integrated result and which local source contains it. Do not imply it is deployed. Existing publicly distributed question copies remain outside the protection this change can provide.
