# SJS Olympiad security PoC plan

Authority: `SJS_Olympiad_Security_PoC_Brief.md`. Planning, implementation source/configuration and available local checks are complete. Standard type checking passed; all 34 tests passed (28 controller tests plus six actual React DOM integrations, including same-stack question removal). A production subpath build transformed 38 modules using ignored local native/WASM and worker workarounds; HTML, JavaScript and CSS returned HTTP 200 with correct MIME types, and the development recovery utility is absent from production. Standard build/browser execution was blocked by sandbox child-process IPC `EPERM`; 12 authored browser cases have not run. No workaround configurations are committed and the original esbuild was restored. Standard toolchain/browser verification, device checks and publication remain pending. Publication is a manual GitHub Desktop user action; no Git mutations or live deployment are part of the current agent work. Local tooling now uses an AppData working copy to keep generated dependencies out of the synced source folder; that new setup still needs validation on this machine.

## Scope and references

Build a small standalone React, TypeScript and Vite application with modern CSS and minimal dependencies. Include one dummy chemistry question and demonstration answer buttons, without scoring or a backend. Prepare an independent GitHub repository with repository-path GitHub Pages hosting and automatic deployment from `main` through Actions. The destination is deferred.

Read-only reference locations:

- `C:\Users\JELC\St John's School Leatherhead\Chemistry - Staff Resources\29. St John's Olympiad` — existing Olympiad material and Power Apps exports.
- `C:\Users\JELC\St John's School Leatherhead\Chemistry - Staff Resources\32. Masters of Chemistry\apps\Masters-of-Chemistry` — application/editor precedent.

Consult relevant app/editor examples for established presentation and authoring behaviour. Record the provenance of any reused design or content, preserve authored Unicode and UTF-8, and do not copy sensitive information, credentials, pupil records or unrelated application data. Existing Power Apps exports remain separate from the new React implementation.

## Security decisions

One controller owns the authoritative `NOT_STARTED`, `ACTIVE` and `LOCKED` session and event log. React components consume its state; they do not install competing security listeners. Keep storage and PIN verification behind interfaces that can later receive server implementations.

Internal start/unlock transitions gate question rendering. Fullscreen-entry notifications are harmless during these transitions, but hidden visibility, blur or fullscreen loss cancels the pending attempt; never suppress genuine departures. Fullscreen requests originate directly from genuine start/unlock button gestures. Use transition tokens to invalidate stale asynchronous completions. Before committing ACTIVE, verify the token, root-element fullscreen, page visibility and focus. There is no post-start grace period for pupil activity.

During ACTIVE, hidden visibility, window blur and fullscreen exit synchronously change controller state to LOCKED and remove the question without waiting for persistence. Preserve the first primary reason and timestamp. Related signals within approximately 500 ms belong to the same incident; later signals while already locked do not create repeated lock records.

Persist a complete versioned session/event snapshot before exposing ACTIVE content. Serialize adapter writes so stale local ACTIVE saves cannot overtake a newer lock. Start includes `COMPETITION_STARTED`; successful unlock includes `STAFF_UNLOCK` in the same committed ACTIVE snapshot. An incorrect PIN records `INVALID_STAFF_PIN` and stays locked. Failed fullscreen or failed save leaves the question gated: unsuccessful start remains NOT_STARTED with an error, and unsuccessful unlock remains LOCKED. Recheck transition conditions after persistence; stale work must never restore ACTIVE. The synchronous test verifier preserves the fullscreen gesture; a later asynchronous verifier will need a separate explicit resume gesture after verification.

Restore persisted LOCKED directly. Restore persisted ACTIVE as LOCKED with a `SESSION_INTERRUPTED` event, preserving the original start time. Handle `pagehide` and back-forward cache restoration so navigation/reappearance cannot revive an active question outside validated competition mode. Initialization stays gated until restoration finishes.

Storage access errors, corrupt JSON, invalid snapshot versions and inconsistent records fail closed into a recovery message/locked state. An absent snapshot permits NOT_STARTED only when storage is available. Storage failures may prevent durable recording, so explain that limitation without showing the question. Keep synchronous browser storage details inside the adapter and future asynchronous service operations outside immediate lock enforcement.

Cross-tab invalidation can lock/gate a tab when another tab changes or clears the shared session; it can never activate or unlock that tab. Treat conflicting state conservatively. `localStorage` is neither transactional across tabs nor secure against tampering; do not claim it guarantees exclusive sessions. Web Locks are not required for this PoC.

The temporary verifier uses clearly named `TEST_STAFF_PIN = "271828"`. Its code comment and README explain that the public JavaScript bundle reveals this PIN and that it tests staff recovery UX only. Reset/testing controls exist only in NOT_STARTED and are disabled during transitions. Provide a separate development recovery utility for clearing a stuck session; no normal pupil reset action appears in ACTIVE or LOCKED.

Diagnostics show ISO-backed event times, primary lock reason, event count, user agent, viewport, fullscreen support/status, visibility and focus. Elapsed time uses the preserved competition start time. Accessible, responsive screens provide clear keyboard focus, labelled PIN entry, large controls and textual lock reasons.

## Implementation queue

Use a GPT-6.1 Sol foreman to agree contracts, then assign disjoint ownership:

1. Scaffold/configuration owner: React/Vite/TypeScript setup, dependency lockfile and agreed shared contracts.
2. Security owner: controller, event rules, snapshot adapter, restoration and verifier.
3. UI owner: landing, competition, lock, status, diagnostics and responsive CSS using those contracts.
4. Verification owner: meaningful security unit tests and focused browser tests in separate test files.
5. Delivery owner: Actions deployment and README once configuration contracts are agreed.
6. Foreman integrates and resolves failures; an independent reviewer checks security transitions, persistence, content gating and deployment paths before completion.

Use the brief's implementation priority: state machine, fullscreen, visibility/focus, persistence, unlock, diagnostics, deployment, then polish. Do not add Azure infrastructure now; school/backend approval and a separate backend stage are prerequisites for that future work.

## Verification and acceptance

Unit tests cover transition guards, stale tokens, failed fullscreen/save, first lock reason, related-signal deduplication, snapshot restoration, interrupted ACTIVE sessions, corruption/storage failure and cross-tab invalidation. Ensure unlock success commits its event and ACTIVE snapshot together and that reset is inaccessible after starting.

Focused browser tests cover landing without armed monitoring, successful and rejected fullscreen requests, immediate removal of question content for each security signal, incorrect PIN, rejected unlock fullscreen, locked refresh, event diagnostics and keyboard operation. Simulated browser signals verify application wiring; they do not prove detection of OS actions.

Run type checks, unit/browser checks appropriate to the implementation and a production build. Preview the production output under the repository base path and verify asset URLs. Review small-screen layout, focus visibility and PIN usability.

Manual device matrix: Windows, macOS, Chromebook and iPad where available. Test Escape, tab switch, application switch, minimize, split screen, OS overlays, active and locked refresh/close/reopen, back-forward restoration, wrong PIN and repeated unlock. Record actual event sequences, false positives, fullscreen support and device/browser versions. Unsupported fullscreen must prevent start and explain why.

Acceptance requires the brief's landing/start/lock/unlock/persistence/diagnostics/accessibility behaviour plus production-path loading and successful automatic deployment. Mark device-dependent results as tested, unsupported or pending with evidence; do not equate simulated events with completed device testing.

## Delivery

Node 24 and npm 11 were observed. GitHub Desktop's bundled Git 2.53 was subsequently found, and an independent local `main` repository has been initialized. No remote or commit has been configured yet. Publication will use GitHub Desktop manually; agents do not perform Git mutations. The earlier missing PATH-level Git/`gh` observation is not evidence that Git is absent.

During implementation, verify current official Vite and GitHub Pages documentation before choosing workflow action versions. Configure the Vite base for the selected repository path. Actions should install from the lockfile, run checks/build, upload `dist/` and deploy through GitHub Pages with appropriate permissions/environment and deployment concurrency. Pushes to `main` trigger the workflow. Document the one-off Pages source setting: GitHub Actions.

For local development, `scripts/local-tooling.mjs` mirrors source files into a per-machine user cache directory (`%LOCALAPPDATA%` on Windows), installs there from the committed lockfile, and runs all build/test/dev commands there. Development mode periodically copies source edits into that working copy. The one-time `migrate` command moves the old ignored generated folders out of the synced project only after the local install succeeds and keeps a reversible backup. No symlink or junction is placed in the OneDrive folder; [Microsoft says OneDrive does not support syncing through them](https://support.microsoft.com/en-us/onedrive/restrictions-and-limitations-in-onedrive-and-sharepoint). GitHub Actions retains its normal clean `npm ci` in the runner. The Masters of Chemistry README currently installs `node_modules` and `.npm-cache` inside its app folder; it is a read-only reference, not the source of this AppData mechanism.

“Deployment ready” means configuration, local checks and production preview pass. “Published” additionally requires an actual destination, successful remote workflow and verification of the live repository-path URL. Keep those completion claims separate.

The README must include purpose, local commands, build/deployment setup, test PIN, device procedure and the browser-security disclaimer. This is a deterrence/detection PoC: unmanaged BYOD, second devices, developer tools, disabled JavaScript, localStorage manipulation, bundle inspection and some OS overlays remain outside its guarantees. A later approved backend moves authoritative sessions and staff authentication server-side.
