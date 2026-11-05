# J09 Spec review — FAIL

Reviewed frozen `37c2d0474ec4af48f891642cb51f305209a9cd5d` against preserved baseline `3e8d8488fb15a64332405aa30ea5dc7361d1e2b4`, using `git diff 3e8d8488fb15a64332405aa30ea5dc7361d1e2b4...HEAD`. Independent reviewer; no implementation edits.

## Finding

**P2 — Residual scientific runtime names disclose U5P5's instrument before authorisation.** `src/questions/u5p5/Chromatogram.tsx:40` emits `gc-chromatogram`; line 13 reads `retentionTimes`. `src/questions/u5p5/GcInstrument.tsx:46` and neighbouring lines retain question-bound carrier/injector/detector selectors and geometry property names. `src/questions/u5p5/ScentsAndScentsibility.css:36` ships the chromatogram selector publicly. This breaches spec.md: “Public renderers must not embed equivalent copies or revealing question-specific literals,” and strict-identifiers.md: “Inspect all remaining … CSS/DOM identifiers … for equivalent clues.”

Reproduction requires no session: inspect the anonymous production CSS/JS. Hash-verified `dist/assets/index-DBIdvuZb.css` contains `gc-chromatogram` twice; `index-LZynjk_5.js` contains it twice plus `retentionTimes`, `gc-carrier-source`, `gc-injecting` and `gc-detector-flash`. These reveal chromatography and its apparatus, beyond neutral routing or generic plotting mathematics. No explicit independently reusable-vocabulary justification exists; analogous NMR/flask names were neutralised. The gate passes because its strict list omits these names and payload-value harvesting misses code-only selectors/property keys. Neutralise the remaining question-bound scientific names consistently and extend source/output/negative coverage, preserving actual scientific values and interactions.

## Verification and limits

All 38 scientific/visual migrations otherwise passed this review: independently replayed 114 exact DOM/aria/image/bounds comparisons, verified 228 screenshot hashes and 20 emitted-file hashes, inspected 15 comparison sheets plus complex full-size diagrams, NMR, cubane, GC apparatus and practical ends. Reconstructed original polymer/cubane/product molecular arrays and compared all three original protocols; independently reran the reviewed 38-record scientific-value/assets invariant and registry validation. Only the two approved raster intrinsic-size exceptions apply.

Reviewed role/year/event/claim/window and stale-response fences, bulk disclosure, memory cleanup, effective IDs, GC recovery, practical saves/previews, pilot isolation, actual audit/10 negative cases and measurement methodology. Existing local 269 API/564 unit/22 contract and browser evidence was inspected; broad suites were not rerun. Loopback measurements do not establish Azure/Node 22/deployment acceptance. Per-content provenance: `review-spec-checks.json`.

**Spec: 1 finding; worst P2. Scientific/visual parity: 38/38.**
