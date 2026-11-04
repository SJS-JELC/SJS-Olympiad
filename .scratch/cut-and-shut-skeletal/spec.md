# Cut and Shut skeletal presentation
Status: completed locally; not deployed

User requests skeletal product diagrams and skeletal answer canvas for U5P9, with a brief explanation. Local execution without delegation: reuse existing Structure renderer and skeletal editor view, retain approved product connectivity and private marking, add scientific/interaction checks, inspect responsive layout, update guides and local preview. Both products use unlabelled carbon vertices and oxygen labels, including methanal after the user requested fully skeletal rendering.

No score, cooldown, answer-key, storage or deployment changes. Keep original source JSON and RDKit assets/generator for provenance; current product layout derives its graph from that source with presentation-only coordinates. Validate implicit and explicit H marking, editing/undo/navigation/locking, visible carbon/hydrogen omission and product connectivity.

## Verification

- Build/typecheck, engine integrity, typography and private source/production-bundle checks passed. Existing large-bundle warning remains.
- 45 focused unit tests passed, including unchanged three-structure marking with implicit/explicit/mixed H, original product graph equality and independently derived CH2O/C9H14O3 formulae.
- Five Cut and Shut browser tests passed, covering skeletal labels/H omission, editing, undo/navigation, cooldown/lock recovery, retained historical data and frozen completed drawings. Layout checked at 960x640, 1200x800, 1440x810, 1920x1080 and 2560x1440; inspected 960 and 1920 screenshots.
- Current local preview hot-reloads the presentation; no backend change/restart or data reset required. No deployment or live-data modification.

## Changed files

U5P9 historical-folder view/CSS; new productGraphs.ts and SkeletalProducts.tsx; shared editor accessible instruction for skeletal mode; focused product/browser tests; mark scheme, framework, AGENTS, provenance and tracker. Original product source JSON and generated RDKit reference assets unchanged.

## Follow-up: complete skeletal rendering and initial zoom

User requested visual verification of the canvas, skeletal formaldehyde, and two extra starting zoom-out steps for U5P9, then U5P2/U5P3. Both products now use skeletal mode. Fixed a mounted editor retaining an obsolete displayed preference: the active representation must be permitted by the current question. Initial zoom is question-scoped and applies the same .8 multiplier twice; other questions and manual Fit are unchanged.

Verified against the actual localhost:5173 preview with a temporary teacher session: a three-carbon answer chain had three atoms, zero visible atom labels and zero implicit-hydrogen nodes; methanal showed only O. Captured and inspected a screenshot. Measured P2/P3/P9 scales at 1920x1080 as 1.2096, exactly two clicks below 1.89. No live storage used.

Follow-up checks: 25 product/marking/editor unit tests passed; all five Cut and Shut browser tests passed again; both editor UI suites (12 tests) passed after the P2/P3 zoom update. Final build, typecheck, typography and private boundary passed. Existing large-bundle warning remains.
