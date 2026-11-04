# Test-tool dependency review

Status: proposed follow-up; dependency upgrades are not part of the architecture migration.

## Finding

The 2 November 2026 npm audit of the locked frontend development toolchain reports critical findings for vitest and tinypool, and a moderate finding for @vitest/mocker. npm proposes a major Vitest upgrade to 5.1.0. These are test-tool dependencies; this observation does not establish an exposed production exploit.

## Next step

Review advisory applicability and the supported migration, then authorise a bounded upgrade. Preserve meaningful test coverage and rerun unit, contract, browser and build checks. Do not run npm audit fix --force blindly.

The application package/lockfile dependency versions were not changed by the architecture work.
