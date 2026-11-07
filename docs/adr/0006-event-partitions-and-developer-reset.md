# Event partitions and explicit developer reset

Status: accepted, 7 November 2026; deployment and live reset remain separate approvals.

Competition storage uses one partition per event data namespace, with a dedicated summary RowKey range and team-specific state/receipt ranges. This supersedes the separate gameplay partition decision in ADR 0002 and the unchanged-layout assumption in ADR 0005. It retains atomic scoring and lifecycle writes while allowing roster, leaderboard and pilot eligibility reads to use a bounded key range without a duplicate, eventually consistent index. Partition capacity is explicitly assumed sufficient for this application's workload; no sharding machinery is required.

Shared school coordination remains with its transactional partners. Reset boundaries follow disposable partitions where possible, with explicit preserved configuration records for the school directory, access codes and pilot mode. The developer reset physically removes other records while the app is idle; it does not weaken normal deletion or retention rules. Explicit layout initialisation replaces production legacy bootstrap, and a pilot reset epoch prevents old local credentials from recreating discarded entries.

Roster mutations return a confirmed outcome independently of their complete readback snapshot. A failed readback never changes a known committed write into an uncertain operation; a refresh retries only the read. No whole roster is stored in mutation receipts.
