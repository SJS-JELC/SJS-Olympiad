# Pilot drawing palette and bond instruction

Type: task
Status: resolved

## Scope

User requested removing the pilot chain tool and explaining click-to-cycle bond orders. Local execution for this small UI change; no delegation.

## Answer

Added an opt-out editor property, enabled only by the pilot, which hides the chain button and prevents its shortcut from activating chain mode. Other editor consumers retain their default palette. The main pilot prompt now explains single/double/triple bond cycling. Updated the pilot guide.

Verification: reviewed the existing modulo-three bond cycling and all chain activation paths. Typography audit and Git diff whitespace check passed. Build/browser verification remains unavailable due to the tooling cache permissions and missing dependencies established earlier in this session. No deployment.
