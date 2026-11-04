# U5P7 Double Trouble
Status: completed locally; not deployed

User approved implementing research/Provisional Future Problems/Double Trouble.md as the new two-mark U5P7, using the existing groups-of-three selection mechanic. Reuse GroupingQuestion, groupingReducer and private partition marking. Display nine mixed-order formula tiles with Unicode subscripts and the original short prompt; no DBE hints. Accept all group/item permutations of the three approved sets. Use the existing incomplete-check behaviour, reset control, colour grouping and a 20-second cooldown.

Execution: local, no delegation. Steps: integrate shared formula tile presentation and private key; add independent chemistry/lifecycle tests; validate grouping regressions, browser layout/navigation/security and build; update guides and preview. Cut and Shut stays U5P9. No live data migration or deployment. Historical U5P7 Cut and Shut records must not be interpreted as evidence of Double Trouble completion; deployed-data acceptance remains separate before any rollout.

## Verification

- Build/typecheck, typography, engine integrity and private bundle boundary passed; existing large-bundle warning remains.
- 87 unit tests passed: independent DBE arithmetic, all 1,296 valid permutations for each grouping question, wrong/malformed partitions, reset/cooldown, once-only scoring and catalogue/private boundary.
- 57 API tests passed, including Double Trouble invalid submissions/cooldown and shared role/event/year/idempotency/preview protections.
- Eight focused browser cases passed: Double Trouble interaction, keyboard selection, local-only edits, navigation/lock recovery, two-point completion; three viewport layouts; U5 catalogue/lock checks; existing L5/L6 grouping regressions. The initial layout-test heading selector omitted the problem-number prefix; corrected the test and all three layouts passed.
- Visually inspected 960x640 and 1920x1080 screenshots; also checked 2560x1440 bounds. No source screenshots committed.
- Local preview restarted to load private marking; only temporary preview data cleared. No live data or cloud configuration changed. Historical U5P7 identity reuse still requires deployment review as noted above.

## Changed files

Added src/questions/double-trouble definition/view, private grouping key in api/src/custom-questions.mjs, independent fixtures and API/unit/browser tests. Shared GroupingQuestion now supports text formula labels alongside its existing images. Updated registry/count expectations, guides and research approval context. Cut and Shut DOM test ID now correctly uses U5P9; its historical source folder remains unchanged.
