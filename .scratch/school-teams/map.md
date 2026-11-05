# School teams map

## Notes

[Spec](spec.md) owns scope. [Current guide](../../docs/schools-and-teams.md) describes implementation. [ADR 0002](../../docs/adr/0002-school-identity-and-roster-allocation.md) records identity and transaction choices.

## Decisions-so-far

Shared school identity, derived names and durable allocation journals implement the accepted design. [01 — implementation](issues/01-implement.md) is resolved: 159 backend tests and relevant static checks passed; [verification](verification.md) records blocked tooling/runtime checks. [02 — root review](issues/02-review.md) owns independent acceptance.

## Fog

Browser rendering, complete TypeScript checking, production build and live Azure acceptance require their respective runtime/tooling evidence. No deployment is authorised.

Root source review completed: [02](issues/02-review.md) resolved with the runtime validation limitations above retained.
