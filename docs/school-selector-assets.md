# School selector assets

The five SVGs in `src/assets/selector/` are the code-drawn vectors from the user-approved design preview in `../../research/team-selector-references/mockup/`. The reference PNGs remain research inputs and are not shipped. The hazard frame follows the supplied Hazard Confirm concept; its open-padlock LOCK IN and closed-padlock orange LOCKED states share geometry. `python scripts/generate-hazard-lock.py` regenerates LOCKED from the default vector master. These are project design assets; no additional third-party licence claim is made here.

`SchoolSelector` stretches the centre while preserving the end-cap proportions. `selector-art.ts` tints trusted masters using validated six-digit hex values. Two-colour variants prefix internal SVG IDs, overlap their clipped halves by one source unit to prevent a hover seam, and draw a continuous top-light gradient. A bounded memory cache avoids regenerating variants. The unavailable master stays grey.

The selector reserves its space while its label font loads, then measures and reveals the fitted grid together. Cached fonts are fitted before first paint. Failed font loads use the fallback font; viewport changes still refit the visible grid.

## Palette provenance

The defaults in `api/src/school-colours.mjs` carry forward the approved preview. [Research and linked sources](../../research/team-selector-references/school-colours.md) distinguish official specifications, third-party values and design approximations; these are not all verified exact school brand standards. The user supplied Freemen?s `#B22527`, Reed?s `#03172D`, St John?s `#024633`, and JAGS `#D63327` / `#001758`. Settings can replace every default.

Defaults match public school names only. No attendance records, contacts, pupil identities or mockup team allocations are imported into the app. Aliases affect lookup/display only; they never merge school identities. Saved palettes take precedence, are persisted with the school, and survive renames. Unsaved defaults are resolved by the current name without rewriting storage.
