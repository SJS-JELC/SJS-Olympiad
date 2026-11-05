# Protected question content: final delivery

Status: Complete locally and accepted by root. All authorised implementation, validation and independent-review gates passed; no deployment performed or authorised.

## Source and preservation

- Implementation checkout: `C:\Users\jelc\St John's School Leatherhead\Chemistry - Staff Resources\29. St John's Olympiad\.protected-content\integration`. Branch: `protected-question-content/integration`.
- Frozen reviewed runtime:3ce45d0e93140eea17ff1a5074e93d554fcf96e4. Subsequent delivery commits contain tracker/evidence metadata only.
- Preserved current-source baseline:3e8d8488fb15a64332405aa30ea5dc7361d1e2b4; original app HEAD remains6b0b790657507f6e99b637a061e4cc3726461bf4.
- [Original preservation check](evidence/original-preservation.json):610 original source files byte-identical, the 611th is the authorised foreman run log;0 unexpected changes and0 added original-app files. The original app working tree/history was not used for implementation.
- Raw source ZIP:workspace `.protected-content/baseline-source.zip`, SHA256 `2d43075f0cc6fef7424467a26f030c28c0a0da5fe20400f73a50cfec0ca96ad3`; all 611 entries verified against original raw hashes. Git baseline text is separately EOL-normalised.
- [Complete changed-file manifest](evidence/final-changed-files.json) records versioned Git-blob hashes and groups every changed path; it excludes its own self-reference.

## Delivered behaviour

All 35 theory questions and 3 practical protocols now load typed server-owned presentation and protected binary assets on first opening. Server role, event/year, team ownership/security and independent start-inclusive/end-exclusive windows apply in draft and active events. Teacher previews stay isolated; decorative header art and the intentional public Funny Bones pilot remain public. Private marking, clocks, atomic scoring and receipts remain authoritative.

Successful content/assets are deduplicated and cached only in the current page/context; unchanged-context revisits transfer no content. Authority/window/context loss clears protected static/custom data and revokes blobs; late responses cannot repopulate it. Generation-owned selected reads now recover without stale-flight spinners. Practical closure removes protocol/labels while permitted numeric working/results and save/discard/navigation protections remain. No static scientific fallback remains.

Scientific text/Unicode, diagrams, graphs, field labels, units, original interaction behaviour and source attribution are preserved. Only two approved raster intrinsic-size differences exist: L5P7 and the L6 practical; displayed geometry/labels match.

## Verification

| Gate | Result |
|---|---|
| Full API |269 passed; independently rerun by foreman after final merge |
| Full frontend units |590 passed, including 26 new actual-hook race/Retry cases |
| Node contracts |22 passed |
| Affected browsers |77 distinct passing cases, including 6 real delayed-response races; initial69/71 timeouts retained, serial recheck31/31 |
| Scientific/rendered parity |38 records and all assets invariant;114 exact comparisons at1200×800,1920×1080,2560×1440; fresh visual sheets plus9 GC pairs |
| Production build |38 record validators, engine sync, typography, TypeScript, Vite, private marking and whole presentation audit pass; foreman rerun passes |
| Public boundary |248 local browser dependencies,20 emitted files,450 text/ID markers,74 asset hashes,898 SVG fragments; all 16 planted leak probes rejected |
| Independent review |Standards PASS and Spec PASS after both original P2 findings corrected;0 open findings |

[Final fix evidence](evidence/j10-fix.md), [validation](evidence/j10-validation.json), [scientific invariants](evidence/j10-science.json), [boundary](evidence/j10-boundary.json), [negative probes](evidence/j10-negative.json), [rendered comparisons](evidence/j10-render.json), [visual provenance](evidence/j10-visual.json), [independent reports](review-summary.md) and foreman-fixed-api/build.txt provide the underlying evidence.

## Local transfer/load evidence

[All 38 measurements](evidence/j10-transfer-load.json) include actual competitor content/assets, selected GC/timed state and practical numeric reads. GC first opening totals 378,019 raw bytes; the largest protected asset is the 2,149,009-byte practical PNG. Gzip/Brotli figures are local per-response compression measurements.

| Concurrent openings | HTTP requests | Response body bytes | Errors | p95 ms |
|---:|---:|---:|---:|---:|
|25|69|3671916|0|116.0|
|50|125|7183857|0|132.4|
|100|248|11210345|0|241.2|

These are warm synthetic in-memory services over actual loopback HTTP, excluding setup, TLS/headers, browser rendering and real storage/network variability. They do not establish Azure capacity or compression.

## Preview

Run from the implementation checkout:

```powershell
$env:SJS_OLYMPIAD_TOOLING_PROFILE = 'protected-reviewed-preview'
node scripts/local-tooling.mjs local-preview
```

The existing loopback preview uses synthetic memory-only data. Teacher previews can inspect content outside configured competitor windows. Dependencies/build output stay outside synced source. For browser tests, put trace/output artifacts in an external sibling of the preview mirror and use one worker for security/cross-tab cases; trace-resource HTML under the watched mirror caused reloads during an initial test run.

## Limits and acceptance

All verification was local Windows/Node 24/Chrome with synthetic memory repositories. Managed Node 22, Azure storage/runtime/compression/capacity and deployed acceptance remain unverified. Existing dependency audit findings were not introduced or changed. Previous public downloads cannot be retracted; authorised recipients can retain content. No cloud configuration, deployment, publishing or live-data testing occurred.

Root accepted reviewed runtime 3ce45d0e93140eea17ff1a5074e93d554fcf96e4 and metadata 7f5f0be1142e7138e23b2d19e1484319f50235a0 after reading the delivery/review reports and checking clean status/history. [Acceptance record](evidence/root-acceptance.json). All J01–J10 tickets are resolved locally; deployment acceptance remains separate.
