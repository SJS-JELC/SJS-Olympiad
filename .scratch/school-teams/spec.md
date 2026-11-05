# Shared schools and numbered event teams

Status: implemented locally; independent root review and tooling-limited acceptance outstanding.

## Accepted scope

- Permanent shared school IDs, editable unique names and an independent host flag.
- Permanent team IDs independent of display names; school-linked names always derive from current school name plus number. No frozen name.
- Existing teams remain unlinked until explicit manual linking to an unused number in an unfinished event.
- School target counts 1–50, default two or editable host default four in each event. New events automatically create four host teams.
- Increasing creates missing teams with numbers above every earlier allocation; reducing uses existing guarded deletion. Number reservations survive removal and deletion.
- Group teacher rosters by school. Preserve individual competitor selection and leaderboard ranking.
- Global school rename affects linked historical results and claimed-team read projections. Completed rosters otherwise remain read-only.
- Preserve claims/gameplay during additions, linking and rename. Year reset preserves IDs, school metadata and allocation history while resetting gameplay.
- Durable request-bound plans, visible partial progress and safe resume after storage/network failures. Block activation during incomplete setup.
- No deployment, cloud configuration change or live-data operation.

## Delegation

One existing direct implementation worker (`gpt-6.1-sol`, high reasoning), initial/max concurrency one; no worker delegates. Root owns final source/diff review and acceptance. Work is one coherent implementation unit because storage allocation, projections and the teacher UI share invariants. No model escalation or capacity change. Root revises consequential scope changes. The worker owns implementation, documentation and focused validation; the root reviews those artifacts before acceptance.

## References and acceptance

- [Decision](../../docs/adr/0002-school-identity-and-roster-allocation.md), [current guide](../../docs/schools-and-teams.md).
- [Implementation and validation ticket](issues/01-implement.md).
- [Wayfinding](map.md), [delegation log](delegation-log.md).
- Synthetic backend tests cover authorization, normalization, host setup, target semantics, no reuse, partial failure, concurrent retry, deletion replay, linking/rename projections and year reset.
- Browser cases cover the grouped UI, defaults, preserved input, frozen retries, linking/historical rename and partial progress. Typecheck/build and browser execution depend on local tooling availability; record any blocked checks explicitly.
