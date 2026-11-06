# School selector

## Notes

User authorised applying the approved design preview to the app and shared school colour settings. Latest direction: do not spend further effort on tests.

## Decisions-so-far

- [First-paint fix](issues/02-first-paint.md): selector waits for font readiness and fitting before revealing tiles; spinner unchanged. Typography/whitespace checks pass; build/browser validation blocked by local tooling access.

- [Implementation](issues/01-implementation.md) resolved locally. Both entry modes share vector components; school palettes persist through a teacher-only revision-guarded operation. Defaults are read-only presentation fallbacks.
- Keep competition claim/fullscreen rules and pilot recovery semantics. LOCKED must never mean merely pending.

## Fog

Typecheck/build/browser acceptance is unverified because tooling dependencies could not be installed. Frontend assertions for replaced controls require updates if testing resumes. No live deployment acceptance is claimed.
