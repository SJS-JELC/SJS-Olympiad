# Domain docs

## Layout

This project uses a single context:

- `GLOSSARY.md` at the app repository root for shared terminology.
- `docs/adr/` for numbered architecture decision records.

## Before exploring

Read the glossary and decision records relevant to the task.

If these files do not exist, proceed silently. Do not suggest
creating them merely because they are absent. Create them when
domain terms or decisions are actually resolved.

## Vocabulary

Use the glossary's terms consistently in issues, proposals,
code, and tests. Avoid synonyms the glossary explicitly rejects.

If a needed concept is missing, reconsider whether it matches
the project's language or note the gap for domain modeling.

## Decision conflicts

Explicitly flag proposals that contradict an existing decision
record, identifying the record and explaining why reconsidering
it may be useful.
