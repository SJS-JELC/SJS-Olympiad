# Project organisation and architecture repair

Status: complete locally (2 November 2026); no deployment or publication performed.

## Agreed direction

The React application is the only current app and the heart of the project. Retire the NEW APP name. Remove obsolete Power Apps workflow and file references from root guidance. Preserve historical materials and source attribution within the archive and app provenance records.

## Delivered structure

```text
29. St John's Olympiad/
  README.md                 concise project entry point
  AGENTS.md                 current scope, safety rules, navigation
  app/                      current application; existing Git repository intact
    .git/
    .scratch/               versioned plans, specs and implementation tickets
      README.md             current priorities and links
      project-organisation/
    src/ api/ tests/ scripts/ public/
    docs/                   current technical guides and decisions
  research/                 question and practical ideas, sources and drafts
  Event Plans/              event delivery documents
  PR/                       existing communications materials
  administration/           contacts and attendance spreadsheets
  archive/                  historical app sources and migration material
```

The exact placement of remaining root reference documents and artwork follows an inventory of consumers. Do not move files based on extension alone. Keep active generator inputs and licensing/provenance records with their owning app module. Keep existing Event Plans and PR names unless there is a concrete navigation benefit to changing them.

## Scope and constraints

- This plan does not authorise deployment, publication, data resets or changes to chemistry/marking policy.
- Preserve all current working-tree changes, including deletions; do not reset, stash or commit them automatically.
- Keep the nested app Git history, remotes and repository-relative CI paths. Do not initialise a new root repository or flatten the app into the event workspace.
- Inspect active local processes and paths before renaming. Coordinate any required preview restart; never silently destroy an in-memory preview session.
- Remove root Power Apps instructions and file references. Move still-useful historical guidance into the archive. Root may link to the archive generically.
- Retain source hashes, licensing and archived originals. Update current location references without rewriting historical provenance facts.
- Treat local code, test results and deployed acceptance as separate states. Do not infer deployment from a README or implemented code alone.
- Existing cache tooling remains the mechanism for keeping generated output outside the synced source. Inspect before using its migration command; do not recursively delete generated folders blindly.

## Delivery order

1. Establish a baseline and file/path ownership inventory.
2. Rename NEW APP to app and repair root orientation and path references.
3. Consolidate planning and research navigation; reconcile current app guides.
4. Repair obsolete acceptance tests and make required validation gate deployment of the same revision.
5. Deepen question-state reconciliation through the real production path.
6. Clarify generic chemistry engine and memory-adapter ownership.

Each stage can be reviewed independently. Stages 1Ã¢â‚¬â€œ4 are the priority delivery; stages 5Ã¢â‚¬â€œ6 are bounded follow-up refactors after the baseline is trustworthy. Do not introduce hypothetical plugin frameworks or split the transactional server module merely because it is large.

## Planning convention

Use app/.scratch/<feature>/spec.md and issues/NN-slug.md, with Status, Type and Blocked by near the top. Preserve the existing open/claimed/resolved task states. The index records priority and whether an effort is proposed, authorised, deferred or complete. A resolved ticket includes evidence and unresolved limitations; local completion is not deployed acceptance.

Research drafts remain in research/, not in the implementation queue. Link approved work to its source draft; do not copy the whole draft into multiple plans. Keep cross-project Masters dependencies explicit and link to their owning project. Do not recreate historical migration logs or evidence galleries.

## Delegation

Stages 1?3 remain local. Stage 4 uses root plus one direct worker (gpt-6.1-sol, high reasoning) owning browser-test repairs only; root owns tooling, CI and integration. The broader stale-test findings justify this bounded expansion from the original read-only role. Maximum concurrency remains two. The same worker may provide one follow-up read-only review of stages 5?6; no children, no app-behaviour changes or unrelated test weakening. Root owns final acceptance, focused verification and any scope revision. This separates test edits from source/CI changes without concurrent edits to moving folders.

## Acceptance

- app/ opens as the original Git repository; working changes and tracked history survive.
- Current root guidance identifies the React app and contains no obsolete paste/export workflow or Power Apps file paths.
- Active paths resolve; historical references are explicitly historical. Asset provenance remains intact.
- Current plans have one discoverable index, status, dependencies and acceptance criteria.
- README, app rules, contracts and tests agree on durable draft events and Settings-rooted teacher navigation.
- Focused affected tests and required typecheck/build/security checks pass, with unrelated failures recorded honestly.
- Deployment depends on required validation of the same revision; no deployment is performed as part of this work without separate authorisation.
- Reconciliation and chemistry refactors preserve public/private separation, server authority, once-only scoring, timing and editor working state.

## Comments

Source: read-only architecture review, 2 November 2026, and user's instruction to make the app central and retire NEW APP naming. Only this plan and its tickets were created at planning time.

## Completion

All six tickets are resolved. See [verification summary](verification.md). Deployment acceptance and test-tool dependency upgrades have separate tracker entries and were not executed.
