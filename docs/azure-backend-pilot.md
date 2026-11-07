# Azure deployment and storage

## Resources and configuration

Site: https://olympiad.masters-of-chemistry.app (Azure default host lively-coast-06a373f0f.2.azurestaticapps.net). Storage: sjsolympiaddata, UK South. The user has saved OLYMPIAD_STORAGE_CONNECTION_STRING in the Static Web App's Production environment settings. Its value has not been accessed or copied into this repository.

Backend configuration:

| Name | Value |
| --- | --- |
| OLYMPIAD_STORAGE_CONNECTION_STRING | Server-only storage credential; never read into frontend code |
| OLYMPIAD_EVENT_ID | Legacy fixture/bootstrap setting; never initialises the new production layout |
| OLYMPIAD_EVENT_END | Legacy fixture/bootstrap setting; never recreates a production event |

The obsolete OLYMPIAD_EVENT_CODE no longer authenticates roles. Production requires an explicitly initialised compatible layout manifest and configured access codes. Missing/incompatible/maintenance storage fails closed; restarting Functions never creates default credentials or legacy teams. Isolated local fixtures retain default 1234/5678 codes. Teachers create named events through the application. Do not share production storage with PR preview environments; use isolated test storage/settings. Only the two explicit production origins are accepted for writes.

## Deployment

The reusable validation workflow builds the frontend once with Node 24 and, only after all required checks pass, uploads dist as a seven-day artifact. It returns that artifact ID to deployment, which downloads exactly that ID, verifies required files and installs production API dependencies with Node 22 using npm ci --omit=dev --prefix api. Missing or expired artifacts fail without rebuilding or choosing a latest artifact. It uploads app_location: dist and api_location: api with both skip_app_build and skip_api_build enabled and output_location empty. This bypasses Oryx SDK discovery (including the oryx-cdn.microsoft.io network dependency); npm and GitHub setup-node still require their normal network access. Vite copies the public runtime configuration into dist. api/package-lock.json pins the Table Storage SDK. public/staticwebapp.config.json selects Node 22 for managed Functions. The frontend build uses Node 24. The validation workflow is .github/workflows/validation.yml; it does not publish. Azure deployment waits for that reusable workflow: all API/unit/contract/build checks and the browser smoke suite on main pushes, or the full browser suite on pull requests. Manual validation defaults to the full suite without deploying. See the README for scope and commands. No credentials are embedded in these files.

The SDK uses the existing OlympiadPilot table. Each event data namespace has one partition, with an authoritative summary range and separate team-specific state/receipt ranges. Team summaries, question state and idempotency receipts still commit transactionally using ETags. Shared schools and allocation journals retain conditional system-partition reservations; multi-team setup remains resumable rather than changing its partial-success contract. See [Schools and teams](schools-and-teams.md) and [API performance and maintenance](api-performance.md). Session ownership/security generations fence scoring, drafts and release/recovery races. Role cookies are Secure, HttpOnly, host-only and SameSite Strict; teacher sessions last eight hours. Authentication/recovery and gameplay remain rate-limited. Teacher diagnostics expose safe instance-local timing summaries without telemetry storage writes.

See api-contract.md for authenticated role/event/team/question/recovery endpoints. All 33 markers are server-side. Browser-supplied scores, correctness, time, role and year never authorize writes. Accepted actions use the current settings snapshot and remain bound to their original event if a teacher ends it while work is in flight. No cross-partition global transaction is promised.

Named events store UTC theory start/end and optional paired practical start/end. Forms interpret wall times explicitly in Europe/London, rejecting ambiguous/nonexistent daylight-saving times. Overall expiry is the latest configured end. Theory reads and actions require the theory window in active events; drafts use real durable claims/results with the same start and end checks; claiming and fullscreen entry may precede it. Teacher preview bypasses this timing without scoring. Legacy records retain an unbounded theory start and inherit their old end, normalized on read without startup rewrites. Practical protocols and numerical responses use their own scheduled window, with local-only teacher practical previews and no automatic marking or theory-score updates.

## Developer cutover

The accepted development cutover reuses the table and discards gameplay/history rather than migrating it. The separately authorised offline operator reset preserves school configuration, configured access codes and pilot on/off, physically removes other records and publishes the new layout. Existing legacy-bootstrap regressions remain isolated fixtures, not production startup behaviour. Deployment and actual reset require separate authorisation; implementation tests never reset live data. Follow the preview, maintenance and verification workflow in [API performance and maintenance](api-performance.md).

## Frontend

Sign in, choose an available event team, then use GO to enter fullscreen and hydrate the active year once. First opening of migrated questions fetches protected content/assets; reopening uses visit memory. Ordinary edits/navigation are local; CHECK sends one direct submission. A breach within the open session immediately removes content and requires teacher-code recovery plus Resume. Refresh/reopening signs competitors out, retaining team reservations and checked results; staff must allow reselection before the old team is available again. There is no periodic session poll or separate preflight. Each protected endpoint still authenticates and checks ownership, security and event times. Teacher theory contexts start blank, fetch selected custom state as needed and remain unscored; teacher practical inputs are local-only. Unchecked theory answers/undo are not saved.

The teacher leaderboard uses authoritative active-event summaries, excludes zero scores, and ranks by score descending then last successful scoring time ascending. It polls every three seconds only while visible. Presentation files are downloadable by design; marker keys and protected API operations remain server-side.

## Acceptance still required

Run the full API, unit and browser suites, typography/type/build checks, private-bundle audit and independent security/chemistry/rendered reviews. Local stores and browser fixtures do not establish Azure connectivity. Real Table Storage and managed Functions acceptance remains a separate deployment gate.

After an authorized deployment/cutover, verify compatible layout and preserved configuration, code rotation/session lifetime, event transition rules, claims/release, fullscreen breach/recovery, checked-result restoration, practical autosave, one-time hydration/direct-CHECK request counts, representative ordinary/graph/timed/GC questions, once-only awards and ranking/polling against isolated test data before event use. Compare correlated timings and operation counts with the local baseline. Do not infer live acceptance from local success.
