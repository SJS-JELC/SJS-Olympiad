# Azure deployment and migration

## Resources and configuration

Site: https://olympiad.masters-of-chemistry.app (Azure default host lively-coast-06a373f0f.2.azurestaticapps.net). Storage: sjsolympiaddata, UK South. The user has saved OLYMPIAD_STORAGE_CONNECTION_STRING in the Static Web App's Production environment settings. Its value has not been accessed or copied into this repository.

Backend configuration:

| Name | Value |
| --- | --- |
| OLYMPIAD_STORAGE_CONNECTION_STRING | Server-only storage credential; never read into frontend code |
| OLYMPIAD_EVENT_ID | Existing stable legacy event ID, used only for first bootstrap/migration |
| OLYMPIAD_EVENT_END | Initial legacy event end as ISO UTC, used only for first bootstrap |

The obsolete OLYMPIAD_EVENT_CODE no longer authenticates roles. First bootstrap creates salted hashes for competitor code 1234 and teacher code 5678. Subsequent code/event changes live in the settings entities; restarting Functions or changing bootstrap variables must not overwrite them. Teachers create new named events through the application rather than changing the storage namespace. Do not share production storage with PR preview environments; use isolated test storage/settings. Only the two explicit production origins are accepted for writes.

## Deployment

The existing Azure GitHub workflow now uses api_location: api, output_location: dist. api/package-lock.json pins the Table Storage SDK. public/staticwebapp.config.json selects Node 22 for managed Functions. The frontend build still uses Node 24. The validation workflow is .github/workflows/validation.yml; it does not publish. Azure deployment runs independently of that workflow. No credentials are embedded in these files.

The SDK uses the existing OlympiadPilot table. Settings and named events use conditional updates. Team summaries, question state and idempotency receipts share per-team partitions and commit transactionally using ETags. Session ownership/security generations fence scoring, drafts and release/recovery races. Role cookies are Secure, HttpOnly, host-only and SameSite Strict; their lifetime is independent of editable event ends. Teacher sessions last eight hours. Authentication/recovery and gameplay requests are rate-limited. Anonymous or competitor calls cannot access teacher tools.

See api-contract.md for authenticated role/event/team/question/recovery endpoints. All 33 markers are server-side. Browser-supplied scores, correctness, time, role and year never authorize writes. Accepted actions use the current settings snapshot and remain bound to their original event if a teacher ends it while work is in flight. No cross-partition global transaction is promised.

Named events store UTC theory start/end and optional paired practical start/end. Forms interpret wall times explicitly in Europe/London, rejecting ambiguous/nonexistent daylight-saving times. Overall expiry is the latest configured end. Theory reads, drafts and actions require the theory window; claiming and fullscreen entry may precede it. Teacher preview bypasses this timing without scoring. Legacy records retain an unbounded theory start and inherit their old end, normalized on read without startup rewrites. Practical protocols and numerical responses use their own scheduled window, with local-only teacher practical previews and no automatic marking or theory-score updates.

## Existing-data migration

First migration retains the three existing team partitions and legacy attempt rows, assigns the legacy event to L6, and creates versioned L6P8 state from the stored score/solve/cooldown exactly once. It must not reset results, claim owners or ranking time. Missing legacy tokens never release teams. Valid legacy ownership may be restored only after competitor role authentication; confirmed teacher release revokes both legacy and new claims. Migration atomically retires the old authentication fields after preserving their values for the authenticated legacy exchange. Old in-flight writes lose their ETag and old-handler retries cannot authenticate. Reruns also fence partial version-two rows without reimporting results or reviving released ownership. Deployment still needs a controlled cutover and real runtime acceptance. This repository does not run migration against live Azure during development.

## Frontend

Sign in, choose an available event team, then explicitly start fullscreen. The active event determines all competitor questions and scores. A breach immediately removes content locally and locks the server session; refresh requires teacher-code recovery and explicit Resume. Session checks run every 15 seconds and before protected actions; failures remain gated. Saved results and acknowledged semantic drafts restore; undo stacks are local. Teachers preview through isolated unscored contexts without teams/fullscreen and may inspect ended events read-only.

The teacher leaderboard uses authoritative active-event summaries, excludes zero scores, and ranks by score descending then last successful scoring time ascending. It polls every three seconds only while visible. Presentation files are downloadable by design; marker keys and protected API operations remain server-side.

## Acceptance still required

Run the full API, unit and browser suites, typography/type/build checks, private-bundle audit and independent security/chemistry/rendered reviews. Local stores and browser fixtures do not establish Azure connectivity. Real Table Storage and managed Functions acceptance remains a separate deployment gate.

After an authorized deployment, verify bootstrap/migration preservation, code rotation/session lifetime, event transition rules, claims/release, fullscreen breach/recovery, saved drafts/results, representative ordinary/graph/timed/GC questions, once-only awards and ranking/polling against isolated test data before event use. Do not infer live acceptance from local success.
