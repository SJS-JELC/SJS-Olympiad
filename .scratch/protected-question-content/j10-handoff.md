# J10 bounded independent-review corrections

Status: Authorised; both J09 reviewers complete and drained. One fresh gpt-6.1-sol/high fixer; no children. Root retains final acceptance.

Fix both P2 findings from frozen reviewed tip37c2d0474ec4af48f891642cb51f305209a9cd5d. Independent reports are review-standards.md/review-spec.md and their checks JSON in the canonical integration evidence directory. Do not treat a PASS test count as a substitute for the relevant independent recheck.

## F1 Standards: selected-load ownership race

src/cloud/CloudQuestion.tsx retains record.loadFlight when authority/context/selected generation changes. A held L6P3/U5P5 question read blocks the recovery/context-return read. The late old result is correctly discarded, but no fresh effect/request follows, leaving spinner without Retry. Actual-hook deterministic reproduction is in the Standards checks manifest.

Scope or invalidate obsolete selected-state flights by generation, ensure a new authorised read starts, and guard finalizers so an old request cannot clear a replacement flight. Abort is optional optimization; response fencing remains mandatory. Preserve learner working, frozen pending receipts, timed runs, GC completed reports and all content gates. Test held old request across lock/recovery and teacher context-away/back, with old/new responses settled in both orders and old errors. Verify fresh failure has actionable retry and no stale-authority error affects the recovered session.

## F2 Spec: remaining GC scientific runtime names

Neutralise remaining question-bound scientific selectors/property keys consistently: gc-chromatogram, retentionTimes, carrier/injector/detector selectors and geometry property names in Chromatogram.tsx, GcInstrument.tsx, ScentsAndScentsibility.css and corresponding typed record/config/helpers/tests. Inspect full remaining source/emitted group, not only the listed examples. Generic plotting/animation/mathematics stays public; scientific labels/data stay unchanged in authorised payload. Source-only non-emitted types/filenames can be distinguished with proof; do not invent a broad generic exemption for question-bound runtime names.

Extend the whole source/output gate and negative probes for these selectors/property-key leaks that current value harvesting misses. Change only parsed code keys/selectors/explicit schema references; never whole-file scientific-word replacement. Update affected content version and exact-value guard's enumerated key-only allowances. Original scientific text, arrays, geometry, units, labels, asset bytes, private IDs and receipt fingerprints must remain unchanged.

## Verification and delivery

- Reproduce F1 before fix, then actual-hook and real browser delayed-response recovery/context regressions; preserve all existing stale fences/cache/blob/working behavior.
- Full API/unit/contracts/build; meaningful affected GC/timed/cache/security/practical/pilot browser checks; fresh all38 three-viewport exact/visual parity (114 comparisons) after final aliases. Existing untouched broad evidence may be reused with clear provenance.
- Exact38 scientific-values/assets invariant (evidence-only Git source5f5c69b is available), all runtime negative boundary probes and emitted inspection. Required build/tests must remain shallow-checkout portable.
- Refresh affected transfer/version manifests and repeat25/50/100 actual loopback first openings if response bodies/record version change, including2.15MB practical PNG, practical numeric state and selected GC/timed bodies. Local figures are not Azure acceptance.
- Do not alter private marking/scoring/destructive tools, global capacity or cloud settings. No deployment/publishing/live-data operations. Unique tooling profileprotected-j10; never another/default mirror.
- Own necessary code/tests/audit/version/evidence changes; write evidence/j10-fix.md + machine manifests. Do not edit run-log.md or original review reports. Do not mark parent delivery complete; independent reviewers recheck corrections afterward. Ticket11 remains claimed until foreman final reconciliation.
- Commit coherent changes and return implementation commit(s), changed files, tests/reproduction/source-value/boundary/visual/measurement evidence and limitations. One substantive correction then fresh-worker reassignment; second failed attempt escalates root. No additional unrelated refactors or resource-cap remapping (Standards determined those generic budgets are not a scientific leak).
