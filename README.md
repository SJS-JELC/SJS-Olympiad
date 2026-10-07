# SJS Olympiad Security PoC

Testing browser-based competition integrity controls for pupil BYOD devices. This front-end-only React, TypeScript and Vite application uses a dummy chemistry question to test fullscreen entry, interruption detection, persistent locking and staff recovery. It has no backend or scoring.

## Install on another machine

Install [Node.js 24](https://nodejs.org/en/download) (including npm 11), then obtain this source folder through GitHub Desktop or the school sync folder. In a terminal in this folder, check `node --version` and `npm --version`, then run:

```powershell
node scripts/local-tooling.mjs setup
node scripts/local-tooling.mjs install-browser
node scripts/local-tooling.mjs dev
```

The setup command copies the source into `%LOCALAPPDATA%\SJS-Olympiad-Security-PoC\worktree` on Windows and runs `npm ci` there using the committed lockfile. Its npm cache and Playwright Chromium installation also stay outside the synced project. On macOS/Linux the working copy goes in the user cache directory. Run the same setup command on each machine; dependencies and browser binaries are deliberately not synced or committed. If OneDrive reports files as unavailable, let the source folder finish downloading before setup.

Use `node scripts/local-tooling.mjs dev` for development. While it runs, source edits in this folder are copied to the local working copy about every 1.5 seconds; edit this source folder, not the AppData copy. Open the URL printed by Vite. Browser fullscreen support is required to start; an unsupported or rejected request keeps the competition closed.

On a machine that already has generated folders inside this synced project, stop running development servers and run `node scripts/local-tooling.mjs migrate`. It first sets up the AppData copy, then moves `node_modules`, `.npm-cache`, `.verification` and other generated output into an AppData backup. The move is reversible; the command prints the backup location. Do not run `npm ci` directly in this source folder afterward, because it will recreate `node_modules` here.

## Building and checking

```powershell
node scripts/local-tooling.mjs typecheck
node scripts/local-tooling.mjs test
node scripts/local-tooling.mjs install-browser
node scripts/local-tooling.mjs test:browser
node scripts/local-tooling.mjs build
node scripts/local-tooling.mjs preview
```

The local build outputs `dist/` in the AppData working copy. Preview serves that production build locally. Each command refreshes the working copy from this source folder first, and changes to `package.json` or `package-lock.json` trigger a clean reinstall. GitHub Actions still runs ordinary `npm ci` in its disposable runner and uploads its own `dist/`. Automated checks verify application logic and browser wiring; OS interruption behaviour still needs real-device testing.

Current local evidence: standard TypeScript checking passed and all 34 tests passed (28 controller tests and six actual React DOM integration tests, including same-stack question removal). A production build at a repository subpath passed with 38 transformed modules; its HTML, JavaScript and CSS returned HTTP 200 with correct MIME types. The development recovery utility is absent from the production bundle. The tests/build used an ignored local native/WASM and worker workaround because the managed sandbox blocked standard child-process IPC with `EPERM`; no workaround configuration is committed and the original esbuild was restored. Standard `npm run build` and the 12 authored Playwright browser cases still require verification outside that restriction. Browser launch, including an external Edge/CDP attempt, was blocked by IPC failures. Real-device testing and live deployment remain pending.

To preview a repository path locally in PowerShell, substitute the chosen repository name:

```powershell
$env:VITE_BASE_PATH = '/chosen-repository/'
node scripts/local-tooling.mjs build
node scripts/local-tooling.mjs preview
Remove-Item Env:VITE_BASE_PATH
```

Open the preview URL with that repository path appended. Vite's base setting controls production asset paths; it is not a full website URL.

## Deployment

The independent local repository uses `main`. No GitHub destination or live site is configured yet. Publish this repository manually with GitHub Desktop:

1. Add/open this existing local repository, review the files and make the initial commit on `main`.
2. Use **Publish repository** to choose the account, repository name and visibility. GitHub Pages availability depends on the account plan and visibility; a public repository supports Pages on GitHub Free. Do not include sensitive data.
3. On GitHub, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
4. Run **Check and deploy GitHub Pages** from the Actions tab if the first push preceded Pages setup. Later pushes to `main` run it automatically.
5. Confirm both workflow jobs succeed, then use the deployment's actual URL to test the site and its assets.

The workflow uses Node 24, `npm ci`, type/unit/browser checks, a production build, a Pages artifact containing `dist/`, and a separate deployment job. It installs Chromium with Linux dependencies for browser checks. `actions/configure-pages` supplies `base_path` as `VITE_BASE_PATH`, so the build follows the selected Pages repository path without guessing a destination.

Deployment configuration alone does not establish publication. The live URL and GitHub workflow remain unverified until publication. Approach verified against [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [setup-node](https://github.com/actions/setup-node) and [Vite's static deployment guide](https://vite.dev/guide/static-deploy.html).

## Test PIN and recovery

Temporary staff PIN: **271828**. This is a public client-side test constant, discoverable in the JavaScript bundle. It is not secure authentication. A correct PIN restores content only after fullscreen succeeds; incorrect PINs remain locked and are recorded.

When running the development server, execute `window.sjsSecurityRecovery()` in the browser console to clear the local test session and reload. Normal pre-start testing controls are available only before competition starts. Recovery does not appear as a pupil-facing reset while ACTIVE or LOCKED, and the development utility is excluded from the production build.

## Test procedure

Start competition, leave fullscreen with Escape, then unlock. Repeat with a tab switch, another application, browser minimization and split-screen use. While locked, refresh and close/reopen the page; it must remain locked. Enter an incorrect PIN, retry a correct PIN and verify fullscreen is restored before the question returns. Also refresh while active; restoration must require staff recovery.

Use Security Diagnostics to record reason, timestamp, event sequence and browser information. Related interruption signals should produce a single primary lock incident. Test failed/unsupported fullscreen and ensure the question stays hidden. Check keyboard focus, PIN entry and tablet layouts.

| Device | Test actions | Record |
| --- | --- | --- |
| Windows laptop | Escape, tabs, Alt+Tab, minimize, split screen, overlays | Browser/version, events, false positives |
| Mac | Escape, tabs, application switching, minimize, split view | Browser/version, events, false positives |
| Chromebook | Fullscreen exit, tabs, app switching, minimize, split screen | Browser/version, events, false positives |
| iPad | Fullscreen availability, app switch, split view, keyboard and touch | OS/browser, unsupported flows, events |

For every available platform also check locked refresh/reopening, wrong PIN and repeated unlock. Mark untested devices as pending; browser automation cannot establish what OS events a particular device emits.

## Security limitations

This proof of concept does **not** provide secure examination lockdown. A browser application cannot control an unmanaged BYOD device. It cannot reliably prevent use of a second physical device, sophisticated developer-tools manipulation, disabling JavaScript, editing or clearing localStorage, inspection of the client-side PIN, some operating-system overlays or determined deliberate bypass attempts.

The objective is to detect and strongly discourage ordinary tab changes, application switching, minimization, fullscreen exit and use of other windows. Event delivery and false positives vary by browser/platform. Storage is local to the browser profile, can fail or be removed, and is not transactional across tabs or tamper-secure. Clearing site data or changing profiles bypasses local persistence.

The controller hides questions on detected interruption and treats unsafe restoration/storage conditions conservatively. Later server-side competition sessions and staff authentication require a separate approved backend stage. No Azure service is included here.

## Project references

The implementation follows [the security brief](SJS_Olympiad_Security_PoC_Brief.md) and [the architecture/verification plan](docs/security-poc-plan.md). Existing Olympiad Power Apps exports and the Masters of Chemistry app/editor are read-only design references; no production records or assets are imported into this dummy-question PoC.
