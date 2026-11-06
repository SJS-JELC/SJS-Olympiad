# Selector first paint

Type: task
Status: resolved

## Scope

User authorised fixing the initial pilot school layout jump. The spinner change was cancelled; its original behaviour is preserved.

## Plan

Keep selector space reserved until the label font and adaptive fit settle; preserve resize fitting and failed-font fallback. Update the relevant guide and run focused checks and build.

Delegation: local execution; these small shared UI changes do not benefit from delegation.

## Answer

The shared selector now reserves its layout space while loading the actual label font, fits cached fonts synchronously before paint, and reveals tiles only after fitting. Font-load failure reveals a measured fallback; resize observation and unmount guards remain. This applies to pilot schools and competition team selection. The spinner has no final changes.

Verification: typography audit and Git diff whitespace check passed. Reviewed initial/cached/failed font paths and asynchronous cleanup. `node scripts/local-tooling.mjs build` was blocked by EPERM copying into the external tooling cache; that cache also lacks installed TypeScript dependencies. Typecheck, build and browser rendering remain unverified. No deployment performed.
