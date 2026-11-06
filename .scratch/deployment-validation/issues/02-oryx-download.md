# Avoid Oryx SDK download during deployment

Type: task
Status: resolved

## Plan

Execute locally without delegation. Reported deployment failure resets the connection while Oryx retrieves available Node SDK versions from oryx-cdn.microsoft.io. Build with runner Node 24, install production API dependencies with runner Node 22, then upload prepared dist/api using the documented skip build options. Preserve the reusable validation dependency and existing deployment triggers. No push, rerun or cloud changes authorised by this local fix.

## Verification

Static checks passed for build ordering, validation dependency, upload paths, runtime configuration and API lockfile consistency. Existing built dist contains the expected runtime config; installed API SDK imports successfully. git diff --check passed. No YAML parser is installed locally, so full workflow parsing and hosted deployment remain unverified. No push or deployment performed.

Microsoft reference: https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration
