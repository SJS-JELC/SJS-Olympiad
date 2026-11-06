# Loading and presentation readiness

The public `GET /api/olympiad/entry` response is `{mode:'pilot'|'competition', competitorAvailable:boolean}` and is no-store. It reads configuration/settings, never schools, teams or pilot attempts. The existing initialization behavior remains; this endpoint does not eliminate cold starts.

Entry detection runs alongside authentication cleanup. Only the initial mode check uses the full eagle loading screen. Pilot mode starts a background `/pilot` request immediately; GO joins it, and failed fetches offer Retry when needed. Focus refreshes mode/availability without a polling loop.

Competitor presentation downloads start after a successful team claim, before the separate fullscreen GO. `useChallengePreload` uses the router's ContentStore with four workers; each record's assets load sequentially. Theory readiness covers all registered questions for the year; practical readiness covers only the configured practical. Each button independently requires ready content and an open time window. Teachers load only their selected preview.

Presentation endpoints permit valid claimed NOT_STARTED/ACTIVE competitors before opening; timed state/actions, submissions and practical saves are unchanged. A normal NOT_STARTED-to-ACTIVE transition preserves completed downloads and may finish an already-authorized presentation read. Lock/release/logout/expiry/context changes remain fenced, with authority rechecked after asynchronous reads. Readable early content is an accepted product decision; fullscreen is not a confidentiality guarantee.

Content and blob URLs are memory-only. Failures remain retryable, successful downloads are reused, and no timed run is started by preload. Settings catalogue and diagnostics loading use the shared benzene indicator. Reduced motion disables rotation.
