# Clarify generic engine and memory-adapter ownership
Status: resolved
Type: task
Blocked by: 05

Choose one maintained origin and verified distribution for the byte-identical molecule and dot-cross engines, preserving independent server packaging and provenance. Keep private keys/evaluators server-only. Move reusable memory repository ownership out of test helpers if the change reduces coupling; keep test fault injection at the existing repository seam. Preserve the server's transactional guarantees rather than splitting it by size.

Acceptance: engine parity/derivation checks, chemistry regression fixtures, private-bundle checks, memory/Azure repository contract coverage and local preview smoke checks pass as applicable. Tests prove useful behaviour, not merely the new file layout. No live storage writes.

## Comments

## Answer

Public generic engine files are the maintained originals; sync-chemistry-engines.mjs derives/checks the two self-contained API copies without altering their bytes. Production build checks both. Local preview imports api/src/memory-storage.mjs; test fault injection and legacy commit compatibility remain in api/tests/helpers.mjs.

Final integrated validation: 129 API tests, 529 unit tests, 9 node contracts and all 226 browser tests passed. Typecheck, typography, build, private-code gate and engine parity passed. Loopback preview availability and teacher login passed; the temporary process was stopped. Independent review found no blocking issues. No Azure writes, deployment or Git publication.
