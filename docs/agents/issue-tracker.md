# Issue tracker: Local Markdown

Issues and specs live in `.scratch/` relative to the app repository (workspace path `app/.scratch/`). Start at `.scratch/README.md`. This location is versioned with the application.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`.
- Specs: `.scratch/<feature-slug>/spec.md`.
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`,
  numbered from 01, with one file per ticket.
- Record status near the top using a `Status:` line.
- Append discussion under `## Comments`.
- No triage label vocabulary is configured.

## Publish and fetch

When a skill says to publish to the issue tracker, create the
appropriate spec or ticket file using the conventions above.

When fetching a ticket, read the referenced file. If only a
number is provided and it is ambiguous, ask which feature it belongs to.

## Wayfinding

- Map: `.scratch/<effort>/map.md`, containing Notes,
  Decisions-so-far, and Fog.
- Child tickets: `.scratch/<effort>/issues/<NN>-<slug>.md`.
- Each child records `Type:` as research, prototype, grilling,
  or task; `Status:` as open, claimed, or resolved.
- Record dependencies as `Blocked by: NN, NN`.
- A ticket is unblocked when all listed dependencies are resolved.
- Select the lowest-numbered open, unblocked ticket.
- Set its status to claimed before starting work.
- On completion, append `## Answer`, set status to resolved,
  and add a summary with a ticket link to the map's Decisions-so-far.

## Authority and evidence

The index records effort priority and whether work is proposed, authorised, deferred or complete. Tasks retain open/claimed/resolved states. Completion records relevant verification and limitations; local completion does not imply deployed acceptance. Research drafts remain linked source material, not duplicate specs or automatic authority.
