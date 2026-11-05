# School-coloured selectors

Status: implemented locally; validation limited

Apply the approved standalone prototype to competitor team and pilot school selection. Preserve native radio behaviour, authoritative claims, conflict reloads, fullscreen rules/GO and pilot credential/recovery semantics. No deployment or live data changes.

Shared schools expose one or two validated six-digit hex colours. Teacher-only `school-colours` updates use the school revision and an idempotency receipt. Older records use the approved public brand palette on read without migration writes; unknown schools use purple. Saved colours override defaults and survive renaming. No attendance or team records are imported.

Shared selector: vector end caps, stretchable centre, side and gradient top lights, grey claimed state with red stamp, bold Tilt Neon names, dynamic columns chosen for text fit, centred final row, no routine refresh or heading/pane. Hazard LOCK IN stays bright but disabled until valid selection; LOCKED denotes confirmed success only. Short selector names do not rename stored schools/teams.

Delegation: local execution, no delegates. Root owns implementation and acceptance. Verify school API validation/auth/concurrency/idempotency and projections, existing school/pilot regressions, UI behaviour, typography, typecheck and build. Browser checks use isolated fixtures only; report environment limitations.

Research/prototype input: ../../../research/team-selector-references/mockup/ and ../school-colours.md in that reference folder.

Latest user direction: skip further tests. Existing focused API checks passed before that instruction; typecheck/build/browser acceptance remains unverified because dependencies were unavailable. No deployment.
