# Concentrate question-state reconciliation
Status: resolved
Type: task
Blocked by: 04

Review CloudQuestion restoration/acceptance and custom-server fixture duplication. Agree a focused module design before edits; preserve the actual transport/security sequencing and test through the production interface. Consolidate grouping, timed and GC merge rules without inventing a plugin framework. Keep independent expected outcomes in tests rather than duplicating the implementation.

Acceptance: initial hydration, stale responses, pending edits, timed step changes, server-confirmed GC completion, retry/cooldown, completion freezing and reload behaviour remain correct. Existing real-hook coverage is retained or strengthened. Private marking and answer retention rules are unchanged.

## Comments

## Answer

Production acceptance and initial hydration now use question-state.ts; custom-server fixtures use the same client reconciliation with authoritative completion metadata. Existing unit coverage passed; five new boundary cases and nine real-hook contracts passed, including absent/wrong GC completion IDs, replay, report cap, local drawings/grouping, timed prompt clearing and clock conversion. No server marking changes.
