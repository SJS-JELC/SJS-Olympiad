# SJS Chemistry Olympiad

React, TypeScript and Vite app with 33 theory questions: nine each for L5, L6 and U6, and U5 questions 2, 3, 5, 6, 7 and 8. L5, L6 and U6 also have practical protocols and saved numerical responses. The landscape design targets aspect ratios from 3:2 to 16:9.

## Run locally

Install Node.js 24 with npm, then run from this source folder:

```powershell
node scripts/local-tooling.mjs setup
node scripts/local-tooling.mjs install-browser
node scripts/local-tooling.mjs dev
```

For a usable local preview with authentication, marking and temporary test data, run `node scripts/local-tooling.mjs local-preview`, then open `http://127.0.0.1:5173`. It creates the active U6 event “Upper 6th December 2026” with three labelled test teams: 9 December, practical 16:40–17:20 and theory 17:30–18:20, Europe/London. Competitors see the real countdown; teachers can preview every year through Settings → Questions Preview. Use competitor code `1234` or teacher code `5678`. The API runs the production service against memory; data lasts until the preview stops, and Azure is not connected. The server binds to loopback only. Its port-specific local cookie adapter is separate from production cookie/origin rules.

The tooling keeps dependencies, browser binaries and generated output outside the synced source folder in the user cache (`%LOCALAPPDATA%/SJS-Olympiad-Security-PoC` on Windows). Edit this source folder; the dev command mirrors changes into its working copy. Use the same wrapper with `typecheck`, `test`, `test:browser`, `build` or `preview`. Set `SJS_OLYMPIAD_TOOLING_PROFILE` to a short lowercase name to isolate a validation or preview working copy; set `LOCAL_PREVIEW_PORT` to run another preview without stopping an existing in-memory session. Each preview has separate temporary data. On a machine with generated files already inside the synced folder, stop development servers before using the wrapper's `migrate` command to relocate them to a local backup.

Vite serves the frontend; authenticated gameplay requires the same-origin API. Browser tests run the production HTTP/service/marking boundary against an isolated in-memory repository. Live Azure connectivity and migration require separate deployment acceptance.

## Application

- Sign in with the site-wide competitor or teacher code. Initial codes are `1234` and `5678`; teachers can replace them without invalidating issued sessions.
- Competitors select an available team in the active event, then choose GO to enter fullscreen. The event fixes their year and question set. Each challenge shows its own countdown before opening; scheduled phase closure does not cause a breach.
- Teachers manage named events and their teams, preview questions without claiming a team, and open the active event's top-three leaderboard. Teacher sessions last eight hours.
- Settings remembers its three panel expansion states during navigation. Questions Preview opens all current theory and practical questions independently of the selected event. Confirmed team deletion permanently removes draft/unused active team data. Active teams with submitted activity, including a nonempty practical response, are removed from lists while retaining their records and reserving their names. Both outcomes revoke the old device; completed events are read-only.
- Events move from Draft to Active to Complete. Only one event can be active; ending requires confirmation, and a completed event cannot restart. Teachers edit theory and optional practical start/end pairs in Europe/London time. Ambiguous or nonexistent daylight-saving times are rejected. The latest configured end determines overall event expiry; each challenge enforces its own time window.
- All 33 theory questions use server marking, cooldowns and saved results. GO loads the active year once. Ordinary edits and navigation stay local; CHECK sends one submission. Unchecked answers and editor undo stay only in memory and are lost on reload. Timed questions and GC runs retain the server actions needed for authoritative timing and results.
- Practical protocols come from the original `.msapp`, including Floaty's 114 cm³ HCl and 250 cm³ dilution. Competitor numerical responses save individually after a short debounce or on blur/navigation, retaining entered precision; invalid partial input stays local with an explanation. Response4 is the designated final result; all fields use the same styling, without a yellow panel or extra Final answer heading. There is no marking, points or irreversible submit. Practical answers become read-only after their window closes. Teachers see final values and expandable working in the event team table; teacher practical inputs are local-only and never submit or block navigation.
- Confirmed theory completions display a solid red pixel COMPLETE stamp with a transparent interior and their original server time in Europe/London. It animates once, then stays static through revisits; teacher theory previews stay unscored.

Competition Mode locks content immediately on interruption and reports the breach to the server. Within an open session, a teacher code issues a short-lived recovery grant and the competitor explicitly resumes fullscreen without acquiring teacher privileges. Refresh or reopening instead returns competitors to the access-code screen and team selection; the old team remains reserved until a teacher allows reselection, and checked results remain stored. There is no periodic session poll or navigation/save preflight. Known deadlines gate locally; each protected API operation still verifies access and rejects stale claims, expired sessions or closed challenges. Cached teacher summaries may remain visible during an outage; server operations still require valid authorization, and the leaderboard marks retained results as stale. Browser events cannot guarantee device lockdown or prove fullscreen independently to the server.

## Hosting and data

Azure Static Web Apps hosts the site at https://olympiad.masters-of-chemistry.app. `api/` contains Node 22 managed Functions with Azure Table Storage. See [Azure configuration and acceptance](docs/azure-backend-pilot.md) and the [API contract](docs/api-contract.md). Real Azure runtime/storage acceptance remains separate from local validation. Bootstrap migration preserves the existing three L6 test teams and their L6P8 results; rerunning migration never resets them.

`.github/workflows/validation.yml` runs validation. The separate Azure workflow builds/deploys the frontend and API. They are independent workflows; validation is not currently a deployment prerequisite. Frontend tooling uses Node 24. Never place backend credentials in frontend variables or committed files.

## Development guides

- [Question framework](docs/question-framework.md): authoring, state and layout ownership.
- [Typography](docs/typography.md): six shared text roles and heading/score treatments.
- [Cut and Shut mark scheme](docs/u5p7-mark-scheme.md): current U5P7 chemistry.

Regression cases live in `tests/fixtures/`; meaningful unit and browser coverage stays with the app. Generated screenshots belong in ignored test output. Original Power Apps and Masters of Chemistry projects are read-only references. Current source attribution is retained beside assets and adapted editors, including `src/assets/powerapp/manifest.json`; preserve font notices and recorded licensing limitations.

Frontend, API, assets, generators and regression fixtures form one change: include all related modified, new and deleted files in the same commit before pushing. A partial commit can omit server modules or assets required by the new frontend. Local checks do not establish deployment or live storage acceptance.
