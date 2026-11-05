# J10 independent-review corrections

Status: PASS locally for the bounded fixes and verification. Independent Standards/Spec rechecks and root acceptance remain required. No deployment or cloud/live-data action occurred.

## F1: selected-read ownership

`CloudQuestion` invalidates obsolete L6P3/U5P5 selected-read flights and their errors when authority/context generation changes. Recovery or teacher context return starts a fresh read immediately. Each flight has an ownership object; only its own finalizer clears the record's flight slot. All response/current-window/authority fences remain. Invalidation does not clear answer working, pending frozen submissions, GC reports, formulation or drawing history.

[Reproduction](j10-reproduction.json): before the fix, all 24 actual-hook combinations produced one selected request where two were required. The matrix covers both selected questions, lock/recovery and context-away/back, obsolete success/423/transport-error responses, and both settlement orders. The two fresh-error cases verify Retry while the obsolete read remains held. The entire 38-test network-policy file now passes (26 new cases).

Six [browser regressions](../../../tests/browser/selected-load-races.spec.ts) compute actual production-handler responses before holding delivery, then exercise recovery/context return before obsolete settlement. They check obsolete errors cannot relock/overwrite the recovered page and fresh failures show actionable Retry. The final browser helper waits for the response and two animation frames before asserting the settled UI.

## F2: neutral public chart/apparatus names

The complete related group now uses neutral chart/graphic/stream/path/shape/label aliases: selectors and animation names, guide-value keys, geometry properties, corresponding word lookup keys, typed record configuration and renderer/helper references. U5P5 presentation advances from version 3 to 4. The [explicit alias manifest](j10-aliases.json) enumerates every key/selector change. Edits used parsed identifiers/property keys and explicit selector/schema references; scientific strings, arrays, coordinates, labels, private IDs, asset bytes and marking/fingerprint semantics were preserved.

The boundary audit separately inspects runtime identifiers and parsed property keys, beyond payload-value harvesting. New negative cases cover code-only/escaped selectors, bare/quoted/computed property keys and chart configuration. No broad scientific-word exception was introduced. The retained source filenames/import-path strings `Chromatogram.tsx`/`GcInstrument.tsx` and explanatory source comments are provenance/source organization only: the public production build emits neither these names nor source maps; exported runtime functions are now `TraceChart`/`RunGraphic`.

[Scientific invariants](j10-science.json) pass for all 38 records and every asset against accepted source `5f5c69b471937cbf0ba13d724466733ef7815a3c`, with only enumerated key/selector allowances. Original GC apparatus paths/shapes/label positions and formulation colours also remain exact. This evidence-only Git comparison is outside required build/tests; required checks remain shallow-checkout portable.

## Final verification

- Full API: **269 passed**; frontend units: **590 passed across 37 files**; contracts: **22 passed**.
- Standard production build: presentation validation, engine synchronization, typography, TypeScript, Vite, private-marking and protected-content boundaries passed.
- [Clean boundary manifest](j10-boundary.json): **38 records, 248 local browser dependencies, 20 emitted files, 450 markers, 74 asset hashes, 898 SVG fragments, four graph values and three coordinate arrays**. [All 16 negative probes](j10-negative.json) detected.
- Affected browser/parity run: **69/71 initially passed** under eight browser workers. Two tests hit 30-second navigation/GO timeouts (pilot cross-tab and anonymous direct-route checks). The preview also logged reloads when Playwright created trace-resource HTML beneath its watched mirror root; this is a local harness limitation and may contribute to the initial timeouts. The complete pilot/security set plus the six race tests then passed **31/31 with one worker**. Final union: **77 distinct passed browser tests**, including three whole-catalogue capture tests; initial failures/traces are retained, not hidden or counted as first-run passes.
- [All 114 exact comparisons](j10-render.json) passed at 1200×800, 1920×1080 and 2560×1440. [114 fresh visual pairs](j10-visual.json) were inspected in all 15 contact sheets. [Nine additional GC apparatus/preview/report pairs](j10-gc-visual.json) across those viewports were inspected against accepted J08 captures. Only the existing L5P7 Gallium nitride and L6 practical Mohr Crisps raster intrinsic-size exceptions apply; pixel identity is not claimed.
- Existing tests cover GC captured dilutions, report dragging/deletion/intervals, timed run starts/ticks, ordinary frozen retries/local working, security interruptions/stale transitions/reload/cross-tab behavior, blob revocation/cache retry, practical saving and public pilot behavior. The unchanged broad 159-test run was not repeated.

[Validation/log hashes](j10-validation.json) and [changed-file hashes](j10-files.json) retain final-source evidence. Screenshots, traces, contact sheets, dependencies and build output stay outside synced source in the unique `protected-j10` tooling profile. Current API/question-framework guides describe the resulting lifecycle and identifier boundary.

## Refreshed transfer/version and actual-loopback first openings

[All 38 payload/version/asset and load manifests](j10-transfer-load.json) were refreshed. U5P5 version 4 is 5368 raw / 2181 local gzip / 1818 local Brotli bytes; selected GC state remains 372651 / 46335 / 19397 bytes. Total GC opening is 378019 / 48516 / 21215 bytes. The 2,149,009-byte practical PNG, practical numeric state and selected GC/timed bodies are included.

| Concurrent openings | Requests | Body bytes | Errors | p50 ms | p95 ms | Max ms |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 25 | 69 | 3671916 | 0 | 87.0 | 116.0 | 116.1 |
| 50 | 125 | 7183857 | 0 | 90.0 | 132.4 | 136.0 |
| 100 | 248 | 11210345 | 0 | 142.9 | 241.2 | 245.7 |

## Environment, portability and limits

Local Windows/Node 24.13.1, Chrome, Vite 7.3.7 and synthetic in-memory repositories were used. `SJS_OLYMPIAD_TOOLING_PROFILE=protected-j10 node scripts/local-tooling.mjs setup|test|build` synchronizes only this worktree's isolated external profile. Run specific npm/API/browser/audit commands in that profile; the wrapper intentionally accepts no extra arguments. For future runs, place Playwright output in an external sibling of the preview mirror (and use one worker for security/cross-tab cases) to avoid trace-resource HTML triggering Vite reloads. Browser preview was loopback-only at `http://127.0.0.1:4290`; test requests used the production HTTP/service/markers with synthetic fixtures. No other mirror, personal fixture, destructive operation or cloud configuration was changed.

The real HTTP loopback load uses warm modules/sessions, full uncached bodies and identity encoding; compression figures are separate local per-response gzip/Brotli measurements. It excludes TLS/headers, browser rendering and real storage/network variation. Local verification does not establish Azure/managed Node 22/storage/compression/capacity/deployment acceptance. Independent reviewer rechecks remain pending; foreman owns tracker/review reconciliation and root retains final acceptance. Previously distributed content cannot be retracted, and authorized recipients can retain received content.
