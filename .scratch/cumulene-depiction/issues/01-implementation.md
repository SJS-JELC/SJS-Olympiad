# Central carbon visibility and simple cleanup

Type: task
Status: resolved

## Answer

Added a skeletal-only filled dot for neutral carbon with exactly two double bonds. Initial cleanup placement now recognises these centres as linear. Added geometry/undo and renderer regression cases and updated the skeletal guide.

Direct Node assertions passed for C=C=C and O=C=O: 180-degree geometry, chemical equivalence, skeletal-only dots and exclusion of ordinary alkene centres. Typography audit passed. Full unit, typecheck, build and browser validation remain unrun: local-tooling setup failed with EPERM copying into the external AppData mirror. No deployment.

Remaining limitation: crowded-layout spring relaxation has no general angle constraints and may distort linear centres. This change does not claim to solve that broader layout issue.
