# API performance and storage redesign

Status: complete locally; deployment/reset separate

## Approved outcome

Diagnose all API flows, expose safe timings, then reduce actual completion time and request counts. Use one partition per event data namespace, preserving atomic team/state/receipt updates. Return complete roster snapshots with mutations, retaining confirmed-write/readback-failure semantics.

Keep control, pilot and directly keyed session/preview/job records separate. Add an offline, resumable developer reset of OlympiadPilot preserving schools (including deleted-name reservations), access-code configuration and pilot on/off. Resettable history must be physically removed. No live reset or deployment is authorised by implementation approval.

## Measurement and acceptance

Initial Azure investigation has a shared cap of 50 Table HTTP attempts including setup, retries, pages and cleanup. Reserve cleanup attempts before writes. No Azure load tests. Larger local workload: 50 schools, 200 teams, 100 concurrent requests; simulated latency is not cloud capacity evidence. Compare timings, storage counts, retries and errors. No invented latency target before baseline.

Browser bounded recent history, safe timing headers/log correlation and teacher-only instance summaries; no polling or telemetry Table writes. Never retain raw keys, payloads, credentials, answers or personal records.

## Delivery stages

1. Baseline and telemetry (25%).
2. Storage and single-response roster optimisation (35%).
3. Operator reset and bounded investigation tooling (20%).
4. Integration, regression checks and independent review (20%).

## Delegation

Root owns integration, client/tooling changes, tracker and acceptance. One direct implementation worker at a time, inherited model/high reasoning; one fresh independent reviewer after implementation, sequentially. Maximum concurrent agents: root plus one. Reuse workers for coherent follow-ups; root resolves integration failures and revises assignments. No worker subdelegation, model override, deployment or cloud changes.

## Preservation

Starting dirty files are recorded in map.md. Preserve their existing changes. Use external local-tooling dependencies/artifacts. Update guides and ADR for the new transaction/query structure. Actual reset/deployment require separate authorisation.
