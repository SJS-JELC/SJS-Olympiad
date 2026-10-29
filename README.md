# SJS Chemistry Olympiad

React, TypeScript and Vite app with 33 theory questions: nine each for L5, L6 and U6, and U5 questions 2, 3, 5, 6, 7 and 8. Practical is a visual landing control only. The landscape design targets aspect ratios from 3:2 to 16:9.

## Run locally

Install Node.js 24 with npm, then run from this source folder:

```powershell
node scripts/local-tooling.mjs setup
node scripts/local-tooling.mjs install-browser
node scripts/local-tooling.mjs dev
```

The tooling keeps dependencies, browser binaries and generated output outside the synced source folder in the user cache (`%LOCALAPPDATA%/SJS-Olympiad-Security-PoC` on Windows). Edit this source folder; the dev command mirrors changes into its working copy. Use the same wrapper with `typecheck`, `test`, `test:browser`, `build` or `preview`. On a machine with generated files already inside the synced folder, stop development servers before using the wrapper's `migrate` command to relocate them to a local backup.

## Application

- `?theory` opens the selected year's hub; explicit routes use `?theory&year=L6&question=5`.
- `?settings` selects the year and controls Competition Mode. Its problem-testing directory preserves attempts and returns to the directory after a question.
- `?security-test` opens the browser security demonstration.
- Ordinary answers, cooldowns, drawings and local scores survive internal navigation and lock/unlock, then reset on reload. The selected year is remembered locally.
- L6P8 uses the Azure API for marking, team claims, saved results and once-only scoring. Other questions use inspectable local marking. Mixed hub scores are demonstration values.

Competition Mode enters fullscreen and locks content on interruption. Reloading an active session restores it as locked. Staff PIN `1234` is a demonstration mechanism, not production authentication. Browser events and localStorage cannot guarantee device lockdown or prevent storage tampering. Staff unlock/end requires successful persistence; failed saves keep content gated.

## Hosting and server pilot

Azure Static Web Apps hosts the site at https://olympiad.masters-of-chemistry.app. `api/` contains Node 22 managed Functions with Azure Table Storage. See [Azure configuration and acceptance](docs/azure-backend-pilot.md). Cloud runtime/storage acceptance remains unverified; the backend covers only L6P8 and three synthetic teams. Do not use this as a complete competition backend.

`.github/workflows/validation.yml` runs validation. The separate Azure workflow builds/deploys the frontend and API. They are independent workflows; validation is not currently a deployment prerequisite. Frontend tooling uses Node 24. Never place backend credentials in frontend variables or committed files.

## Development guides

- [Question framework](docs/question-framework.md): authoring, state and layout ownership.
- [Typography](docs/typography.md): six shared text roles and heading/score treatments.
- [Cut and Shut mark scheme](docs/u5p7-mark-scheme.md): current U5P7 chemistry.

Regression cases live in `tests/fixtures/`; meaningful unit and browser coverage stays with the app. Generated screenshots belong in ignored test output. Original Power Apps and Masters of Chemistry projects are read-only references. Current source attribution is retained beside assets and adapted editors, including `src/assets/powerapp/manifest.json`; preserve font notices and recorded licensing limitations.
