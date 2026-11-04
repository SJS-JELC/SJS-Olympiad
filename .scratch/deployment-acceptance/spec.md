# Deployment acceptance and rollout

Status: deferred; no deployment or cloud changes authorised by this document.

## Current evidence

The app contains an Azure deployment workflow, server-authoritative marking and Table Storage support. Current guides identify the Olympiad hostname. This establishes configured/intended hosting, not the deployed revision or successful live acceptance.

Local draft events use durable claims and results with start-time bypass only; they are not the former isolated practice backend. The repository's current auth uses server-managed competitor/teacher codes. Microsoft teacher authentication remains a possible future decision, not a completed feature or an automatic replacement requirement.

## Remaining acceptance

Before rollout, identify the deployed revision and required configuration without exposing secrets. Record live authentication/authorisation, storage persistence, simultaneous claims, idempotent retries, connection failures, independent challenge windows, completion and leaderboard checks. Verify rollback and rehearse expected event load with isolated test data.

Local tests and a successful build do not resolve this effort. Creating implementation tickets or executing deployment requires an authorised scope.

## Decision context

The earlier cross-project roadmap is retained at ../../../archive/plans/chemistry-apps-deferred-roadmap.md as history. Its blanket deployment deferral and earlier authentication proposals are not a current-state specification. Masters dependencies belong to the separate Masters project.
