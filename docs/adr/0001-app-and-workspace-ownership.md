# 0001: Application and workspace ownership

Status: accepted, 2 November 2026.

## Decision

The current application lives in app/ at the workspace root, retaining its own Git repository. Root guidance describes the current project and directs contributors into the app. Historical implementation guidance belongs in archive/, not the root.

Plans, feature specs and implementation tickets live in the versioned app/.scratch/ directory. Research, event delivery, communications and administration remain distinct workspace materials. They are linked inputs, not copied into the application repository.

## Reason

The former transitional app name and obsolete root instructions made current ownership ambiguous. Scattered plans also mixed proposed work, implemented behaviour and deployment acceptance.

## Consequences

The root is not a combined Git repository. App CI remains repository-relative and needs no extra app/ prefix. Existing asset identifiers/hashes are preserved, with a separate current-location guide. Current guides state behaviour; tracker records state intended work, authority and acceptance limitations.

Changing this arrangement should preserve app history, personal-data separation and provenance. A large cosmetic move into the workspace root is not required to make the app central.
