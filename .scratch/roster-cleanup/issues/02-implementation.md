# Shared adapter and build artifact

Type: task
Status: resolved

Follow [approved spec](../spec.md).

## Answer

Browser fixture now uses shared memory adapter and preserves transport/lost-response controls. Three contract regressions cover cross-partition rejection, atomic failed ETag and clone isolation; storage cases 6/6 pass. Validation uploads dist only after successful gates and exports exact artifact ID. Deployment downloads this ID, requires expected files, prepares Node22 API production dependencies and retains Oryx skip flags. No frontend rebuild. Workflow wiring independently reviewed; no local YAML parser available, hosted execution remains unverified.
