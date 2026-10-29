# Azure one-question pilot

## Resources and configuration

Site: https://olympiad.masters-of-chemistry.app (Azure default host lively-coast-06a373f0f.2.azurestaticapps.net). Storage: sjsolympiaddata, UK South. The user has saved OLYMPIAD_STORAGE_CONNECTION_STRING in the Static Web App's Production environment settings. Its value has not been accessed or copied into this repository.

Add these additional backend environment settings in Azure:

| Name | Value |
| --- | --- |
| OLYMPIAD_EVENT_ID | pilot1 |
| OLYMPIAD_EVENT_CODE | A private random code of at least 12 characters; no default |
| OLYMPIAD_EVENT_END | A future ISO UTC time, for example 2026-11-30T23:59:00Z |

All four settings are required. Missing configuration returns 503; expired events reject entry/submission. Set a new event ID to create a fresh set of test teams without deleting historical records. Never use real teams during this pilot. Do not share the production storage connection with PR preview environments; provision isolated test storage/settings before using a preview API. Only the two explicit production origins are accepted for writes.

## Deployment

The existing Azure GitHub workflow now uses api_location: api, output_location: dist. api/package-lock.json pins the Table Storage SDK. public/staticwebapp.config.json selects Node 22 for managed Functions. The frontend build still uses Node 24. The validation workflow is .github/workflows/validation.yml; it does not publish. Azure deployment runs independently of that workflow. No credentials are embedded in these files.

On first valid API access, the SDK creates the OlympiadPilot table if absent. Teams are created only when claimed. Per-team state and attempt rows share a partition, permitting an atomic conditional update plus attempt insert. ETags prevent two requests winning against the same state. A distributed counter limits event-entry requests; per-team counters limit submissions. Anonymous reads cannot retrieve a team record. Cookies are Secure, HttpOnly, host-only, SameSite Strict and expire with the test event.

The API is GET /api/olympiad/session and POST /api/olympiad/{teams,claim,submit}. Only L6P8 is accepted. No score, current time, correctness or team identity supplied by the browser is trusted. Claims include a random browser-generated secret to permit safe retry if the response is lost. Session cookies carry the team ID and secret; storage retains only the secret hash. A claim interrupted by refreshing before receiving a cookie can leave a team claimed; use a fresh event ID for pilot recovery. Staff recovery remains future work.

## Frontend

Open `?theory&year=L6&question=8`, enter the event code, and claim one of three test teams. The existing question design remains in use. Check submits to the API; failures never fall back to local marking. The private key is in api/src/marking.mjs only, outside the frontend bundle. Refresh restores the saved result. The hub incorporates L6P8's saved solved state; other questions and their scores remain local demonstrations. This is not a complete competition backend, and the browser security lock is not yet mirrored server-side.

## Acceptance still required

Run node --test api/tests/service.test.mjs, then the frontend typography/type/build checks. The new browser tests use mocked HTTP responses to check rendering, team entry, submission, refresh and outage handling; they do not establish Azure connectivity. Local store tests cover concurrent claims, retries, cooldown boundaries, once-only scoring, team isolation, expiry, distributed rate limits, origin checking and secret-free errors. Real Azure Table Storage and managed Functions runtime acceptance must be completed after publication.

After deployment: verify an incorrect attempt starts a 15-second cooldown; a correct answer awards three points once; refresh restores state; another browser cannot claim the same team; an API outage shows an error; and built JS contains no L6P8 answer key. Only then record cloud acceptance.
