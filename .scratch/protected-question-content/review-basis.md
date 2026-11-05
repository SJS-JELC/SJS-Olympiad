# Independent review basis

Status: J09 claimed. Code is frozen at 37c2d0474ec4af48f891642cb51f305209a9cd5d; implementation workers have drained. Two independent fresh-context reviewers, gpt-6.1-sol/high, no children or code changes. Root retains final acceptance.

## Fixed comparison

- Preserved source baseline: 3e8d8488fb15a64332405aa30ea5dc7361d1e2b4; exact current pre-task source including prior uncommitted work, not original app bare HEAD.
- Review tip: 37c2d0474ec4af48f891642cb51f305209a9cd5d.
- In each detached review checkout: `git diff 3e8d8488fb15a64332405aa30ea5dc7361d1e2b4...HEAD`. Explicit equivalent: `git diff 3e8d8488fb15a64332405aa30ea5dc7361d1e2b4...37c2d0474ec4af48f891642cb51f305209a9cd5d`.
- Non-empty range validated by foreman; 354 files changed, 50820 insertions(+), 1190 deletions(-). Most added lines are source/evidence JSON; inspect runtime/shared code and scientific migrations substantively, rather than dumping all evidence JSON into context.
- Commit list follows below.

## Specification and authority

[Specification](spec.md), [implementation/delegation plan](implementation-plan.md), parent ticket issues/01-implement.md and child tickets02–11. Root authorised execution after planning and explicitly confirmed the [strict scientific identifier/config boundary](strict-identifiers.md). That stricter rule supersedes the initial frozen-seam stable-ID assumption; J08 has closed the tracked cases. No deployment, publishing, cloud config, live storage or personal fixtures.

## Standards sources

- `../../AGENTS.md`
- `AGENTS.md`
- `README.md`
- `GLOSSARY.md`
- `docs/question-framework.md`
- `docs/api-contract.md`
- `docs/azure-backend-pilot.md`
- `docs/typography.md`
- `docs/source-provenance.md`
- `docs/readiness-pilot.md`
- `docs/schools-and-teams.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/domain.md`
- `docs/adr/0001-app-and-workspace-ownership.md`
- `docs/adr/0002-school-identity-and-roster-allocation.md`
- `docs/adr/0003-protected-runtime-identifiers.md`
- `src/questions/_starter/README.md`

No separate CODING_STANDARDS.md or CONTRIBUTING.md was found; search once and include either if present. Repo rules override heuristic smells; skip issues tooling enforces.

## Evidence pointers

- [J08 integration evidence](evidence/j08.md), j08-validation.json, j08-boundary.json, j08-negative.json, j08-science.json, j08-transfer-load.json, j08-render.json and j08-visual.json.
- Foreman independently reran full API269/269 and standard build/whole boundary at integrated tip (foreman-final-api.txt / foreman-final-build.txt in canonical integration evidence; these post-tip logs are read-only evidence, not code changes). Worker unit564/contracts22, broad157/159 followed by clean affected41, fresh114 exact/visual comparisons and10 planted-leak negative checks. Inspect the actual tests/gate/exemptions, not just pass counts.
- All35 theory+3 practicals registered; [inventory](inventory.md) and baseline-inventory.json/baseline-render-{1200,1920,2560}.json preserve source/visual inputs. Original baseline screenshots are under external protected-baseline profile per baseline-render-manifest.json. Final114 screenshot pairs/hashes and15 sheets under protected-j08 per j08-visual.json; GC workbench/apparatus pairs are additional.
- One mechanical key rename altered two prose passages during J08; exact parity caught it, scientific values were restored from accepted source and a full38-record value/assets invariant was added. Independently verify its enumerated key-only allowances and actual final text/geometry; do not blindly trust rewritten fixtures.
- Planned raster exceptions only: L5P7 gan SVG → protected high-res PNG; L6 practical Mohr embedded-image SVG → protected PNG. Source/output provenance retained, displayed geometry and labels exact; intrinsic pixel sizes intentionally differ.
- Scientific Git invariant is evidence-only; required API/build uses versioned inputs and must work in fresh/shallow checkout. Check path casing/asset transport for managed Node22/Linux portability where locally provable; actual Azure acceptance is unverified.

## Reviewer outputs

Write only your owned findings/verification report(s) in your review checkout's evidence directory; no source fixes, tracker edits or run-log edits. Main axis findings report under400words, distinct hard rules/requirements from judgement calls, severity/file+line/source rule/spec quote, concrete reproduction/impact/fix direction. You may attach a concise checked-files/per-content/visual evidence manifest separately for provenance. Report every substantive issue; do not turn the report into a list of tool-enforced formatting nits. Send consequential findings to foreman promptly; final PASS means complete assigned review, not merely tests passing. Foreman will integrate reports and schedule one fixer + relevant rechecks if required.

## Commits

```text
37c2d04 Protect runtime question identifiers and verify complete content boundary
5f5c69b Record all presentation migrations and required integration acceptance handoff
a83587b Connect practicals to shared memory store and register protected protocols
d5ea1dc Protect practical protocols and preserve independent-window working
f9dc66f Register all protected U6 presentations
ec4d107 Protect all nine U6 question presentations and scientific assets
b5e027d Register all protected U5 presentations
1224f30 Protect all eight U5 scientific presentations and preserve public pilot editors
92057f8 Record integrated migration evidence and strict shared follow-up
86a9c2c Retain elapsed GC capture through recovery reads until authoritative tick
4cd29ff Defer practical prop connection until component migration integrates
f6131aa Prepare router-lifetime practical content wiring and teacher catalogue
2b11fd8 Register remaining L6 protected presentations
d991541 Protect remaining L6 scientific presentations and preserve bespoke interactions
a103849 Register migrated L5 presentations in integration
6f7b436 Migrate all L5 scientific presentations to protected server records
6d4be58 Record strict scientific identifier boundary and neutral catalogue contract
0cdb662 Verify first-open presentation transfer and zero revisit transfers
65f3a7e Keep independent grouping display fixtures outside public definitions
5672725 Allow protected grouping payloads to supply bounded tile identities
f57dc00 Protect representative question content behind authorized versioned delivery
597c970 Record complete local baseline validation and render evidence
0ecbf7c Add whole catalogue parity evidence capture
7b1c986 Record protected content inventory and authorised execution jobs
```
