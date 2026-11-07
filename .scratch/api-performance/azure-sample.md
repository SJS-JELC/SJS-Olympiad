# Bounded Azure sample

2026-11-07: direct Node SDK access using the existing local Azure CLI login to obtain the account key internally. No credentials were displayed or committed. Target: sjsolympiaddata/OlympiadPilot.

Only one uniquely named synthetic probe record was created, read, updated and deleted. No existing application rows were read or changed. Cleanup verified by a final 404.

| Operation | Elapsed ms |
| --- | ---: |
| First create | 170.52 |
| Point read 1 | 25.67 |
| Point read 2 | 21.52 |
| Point read 3 | 25.44 |
| Point read 4 | 26.16 |
| Point read 5 | 24.79 |
| Partition + row range | 27.77 |
| Conditional update | 23.35 |
| Conditional delete | 26.62 |

**12 total Table HTTP attempts; 38 remain in the initial 50-attempt allowance.** The persistent budget ledger lives outside the synced project in the operator tooling directory. Azure CLI management-plane credential lookup calls are separate from Table HTTP attempts. Automatic SDK retries were disabled.

This small sample suggests repeated sequential storage trips are worth removing. It does not attribute the reported 2.4-second application delay, measure server-side Azure latency, establish percentiles or demonstrate event capacity. The first create may include connection initialisation; its cause was not isolated.
