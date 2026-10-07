# AGENTS.md

## Purpose and scope

This folder is an independent project for the SJS Olympiad HTML security proof of concept. The current milestone implements the PoC and prepares local validation and GitHub Pages configuration. Publication is currently a manual GitHub Desktop user action; no remote destination is selected. Follow the user's authorized scope for subsequent repository and publication work. These instructions do not impose an additional approval gate on authorized work.

The initial implementation will use a dummy question to test interruption, locking, and staff unlock behaviour. It excludes scoring, real questions, actual asset imports, and production data unless the user expands the scope.

## Local project rules

These instructions replace the inherited PowerApps export and manual-paste workflow within this folder. Do not create `appCodex*.txt` exports or use `YAML Code\` as an implementation destination here.

Use React, TypeScript, and Vite with minimal dependencies. Maintain an independent repository and a front-end-only GitHub Pages deployment. Azure services require school/backend approval before implementation or deployment.

## Read-only references and data boundaries

- `C:\Users\JELC\St John's School Leatherhead\Chemistry - Staff Resources\29. St John's Olympiad`: original PowerApps `YAML Code`, `Other`, and assets are read-only references.
- `C:\Users\JELC\St John's School Leatherhead\Chemistry - Staff Resources\32. Masters of Chemistry`: read-only references, especially `apps\Masters-of-Chemistry` for React, TypeScript, Vite, and chemistry editors.

Do not edit either reference project. Do not copy personal, team, or other sensitive data into this project. Record provenance when deriving design or content from references. Preserve scientific Unicode and UTF-8 encoding; do not replace subscripts, superscripts, Greek symbols, or other authored notation with ASCII. Check edited scientific text for encoding corruption.

## Security contracts

Use exactly three session states: `NOT_STARTED`, `ACTIVE`, and `LOCKED`.

- Load and validate persisted state before rendering question content. A persisted `ACTIVE` session must restore as `LOCKED`.
- Render question content only while `ACTIVE`. Document becoming hidden, window blur, or fullscreen exit must synchronously lock and unmount the question without awaiting persistence or other asynchronous work.
- Entering or unlocking requires a guarded user-gesture flow and successful fullscreen entry. Unlocking additionally requires staff PIN verification. Persist the successful transition before exposing the active question UI; persistence failure must leave the session locked or not started.
- Revalidate pending activation/unlock attempts after asynchronous fullscreen work. An interruption or stale attempt must not reactivate the question.
- Persist the session and its diagnostic events as one atomic snapshot through a localStorage adapter. A successful unlock must include its unlock event in that snapshot.
- Cross-tab updates must never activate or unlock a question. Treat conflicting or unsafe external state conservatively and preserve the lock.
- Keep diagnostics free of sensitive data and question content.

The test staff PIN is `271828` and is insecure. Client-side PIN checks, browser events, and localStorage are a proof-of-concept mechanism, not production access control. localStorage is editable, removable, and subject to availability and cross-tab race limitations; a single snapshot does not provide transactional concurrency across tabs. Document these limits accurately. Do not claim the browser prevents tab switching or guarantees immediate event delivery.

## Validation and collaboration

When implementation is in scope, verify initial entry, staff unlock, visibility loss, blur, fullscreen exit, refresh recovery, persistence failures, interrupted activation, repeated events, and cross-tab conflicts. Review both the rendered question lifetime and persisted session/event consistency.

For authorized multi-agent implementation, use a GPT-6.1 Sol foreman with disjoint file ownership. The foreman assigns work, integrates changes, reviews security-critical transitions, and owns final validation. Agents must coordinate before editing another agent's assigned files.

Keep planning documents consistent with changes to scope, deployment assumptions, or security behaviour.
