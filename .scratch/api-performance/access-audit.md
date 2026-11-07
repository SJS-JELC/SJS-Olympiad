# API access-pattern audit

Static hypotheses were established before implementation; see baseline.md and azure-sample.md for measured limits. The performance view records all allowlisted routes, including failures and binary assets.

| API family | Primary storage path | Optimisation / retained boundary |
| --- | --- | --- |
| Entry, availability, events, diagnostics | Keyed settings/pilot config | Explicit layout initialisation; no startup legacy migration; safe timing visibility |
| Login, logout, session, recovery | Keyed role session, settings and rate counters | Asynchronous bounded password work; retain throttling, code strength and generation checks |
| Claim, start, breach, resume | Keyed session/team/fences | Preserve fresh ownership/security checks and conditional updates |
| Question, action, submit, hydrate | Keyed team/question/receipt, scoped question range | Atomic summary/state/receipt transaction; hydration excludes neighbouring teams |
| Practical and save | Keyed team/practical/receipt | Same atomic revision/idempotency contract |
| Protected content/assets/catalogue | Keyed authority checks; payload from code/assets | Preserve before/after read authority validation; include binary response timings |
| Teams, removed teams, roster | Event summary range plus school directory/control progress | Consolidated readback; mutation returns current complete snapshot once |
| Leaderboard | Current event summary range | Read all pages before ranking; retain existing visibility-bound polling |
| School create/rename/colours/delete | Keyed directory and operation receipts; bounded control/event ranges where discovery required | Preserve directory/name/allocation transactions; no unbounded table discovery |
| School setup/link/resume, event setup/year reset | Event summaries, control journals, team state ranges | Retain resumable partial progress, reservations and fresh namespace publication |
| Team remove/restore/release/delete, bulk/import | Keyed team/receipt/job plus control reservations | One browser response with snapshot; separate readback failure; cleanup fenced and team-scoped |
| Pilot enter/submit/report/mode | Pilot config/attempt/receipt partition; event summaries + shared directory for eligibility | No duplicate school catalogue; retain atomic off-switch guard, reset epoch invalidation |

## Main pre-change hypotheses

- Roster mutation plus three follow-up browser reads repeats authentication/settings/directory work and team discovery.
- `kind`/`eventId` queries without PartitionKey can scan unrelated historical partitions despite returning only filtered team rows.
- Serial storage waits and conflicts amplify per-call latency. Direct local-to-Azure point reads in the small sample were about 22–26ms.
- Synchronous scrypt blocks unrelated Node requests; its cryptographic work factor must remain unchanged.
- Cold initialisation and SDK retries need separate timing rather than being inferred from browser waiting.

## Boundaries

Do not cache claims/security authority across requests. Shared pilot configuration and rate counters remain intentionally guarded rows; partition grouping does not remove their contention. No capacity sharding is introduced. Real hosted latency and percentile acceptance remain separate from local fixtures and the 12-attempt Azure sample.
