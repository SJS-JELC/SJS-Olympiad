# J09 Standards review

**FAIL — complete review: 1 documented-contract finding (P2), 0 heuristic findings.**

Comparison: `git diff 3e8d8488fb15a64332405aa30ea5dc7361d1e2b4...37c2d0474ec4af48f891642cb51f305209a9cd5d`.

## Finding

**P2 — Obsolete selected-state flights block recovery indefinitely.** `src/cloud/CloudQuestion.tsx:135` reuses `record.loadFlight` across security/context generations. The invalidation at line 87 clears readiness/data but retains that flight. Reproduce: hold the first L6P3 or U5P5 `question` response; interrupt, then successfully recover before releasing it. The remounted question reuses the obsolete flight. Its response is correctly rejected at line 147; its finalizer clears the flight without loading again. The effect at line 261 has no changed dependency afterward, so the question remains a spinner without an error or Retry. Navigating away and back happens to recover it. Teacher context-away/back can encounter the same race.

A read-only harness executing the actual transpiled hook reproduced one request, `selectedLoaded=false`, no `loadError`, and no remaining flight after successful recovery and settlement. Existing stale-read coverage manually invokes a second load after settlement and misses this ordering.

This violates `AGENTS.md:53` (“show actionable failures with Retry”) and the selected-state readiness/recovery contract in `docs/question-framework.md`, Protected presentation seam, and `docs/api-contract.md`, Protected presentation delivery. Scope selected-state flights to their authority generation; invalidate obsolete flights and start a fresh authorized load, guarding finalizers against clearing replacement flights. Add the delayed-response-across-recovery regression.

## Verification and limits

Reviewed shared authorization/transport, cache/gates, effective definitions, all migration families, registry/validators, audit scripts, tests and standards sources. Independently passed 32 focused API tests, all 38 scientific value/asset invariants, and exact-case checks on 47 fixed asset paths. Supplied full-suite/build/parity evidence was inspected, not rerun. No additional disclosure, scoring or private-key finding. Generic resource caps are not scientific clues and were not reported as leaks. No cloud/deployment acceptance claim. See the companion checks manifest for provenance and limitations.
