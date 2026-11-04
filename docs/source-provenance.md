# Source locations

Paths in original asset manifests are historical provenance identifiers, not runtime imports. Keep those original names, archive entries, hashes and licence notices unchanged.

| Recorded source | Current location relative to app/ |
| --- | --- |
| Extracted PowerApp/SJS Chemistry Olympiad.msapp (also recorded with a leading ../) | ../archive/Extracted PowerApp/SJS Chemistry Olympiad.msapp |
| Other/Year 11 Draft Questions.md, Cut and Shut | Retired implemented draft; current mark scheme: docs/u5p7-mark-scheme.md. The two unused drafts are now separate files in ../research/Provisional Future Problems/: The disappearing catalyst.md and Who made the nitrogen.md. |
| Original oxyanion CSV | ../archive/reference-data/Oxyanions Question.csv |

Runtime assets and required generator inputs remain inside this repository. The archived source is an external read-only reference; routine builds must not depend on moving it into the app.

Generic editor engine attribution lives beside the retained editor sources. Preserve it when changing engine distribution.

## Generic chemistry engine ownership

Maintain src/chemistry/molecule/core.js and src/components/dot-cross/core.js. scripts/sync-chemistry-engines.mjs copies their exact bytes into the private API package; --check fails on drift. The copies are generic chemistry only, never answer keys. The independent API deployment remains self-contained.

## Local repository adapter

api/src/memory-storage.mjs owns the in-memory repository used by local preview. api/tests/helpers.mjs adds fault injection and legacy-test compatibility only. Azure storage remains in api/src/storage.mjs; both satisfy the existing transactional repository seam.

## U5P4 naming diagram

`src/questions/u5p4/assets/heterocyclic-naming-original.png` is a byte-for-byte copy of `../research/Provisional Future Problems/assets/heterocyclic-naming-original.png`, retained from the retired question bank. SHA-256: `5a23c39f690200c881a71cd2797dd798ea1c713bf60e1909d7c5d861500bf87f`. The approved prompt source and marking rationale are recorded in [U5P4 mark scheme](u5p4-mark-scheme.md). Builds use only the in-repository copy.

## U5P6 Cubone header

The Cubone header SVG comes from [iBotPeaches/PokemonGoRenders](https://ibotpeaches.github.io/PokemonGoRenders/), retained without modification. Source URL, SHA-256 and the repository copyright statement are recorded in `src/questions/u5p6/assets/cubone-provenance.json`. The repository credits The Pokemon Company; it does not state a permissive artwork licence.

## Cut and Shut skeletal presentation

The active U5P9 illustration reads the unchanged `src/questions/u5p7/assets/ozonolysis-products.source.json`. `productGraphs.ts` supplies only display positions; `SkeletalProducts.tsx` renders those graphs using the shared Structure component. The original RDKit illustration, base geometry, generator, licensing and hashes remain intact as historical references. No third-party artwork or answer graph was added for this change.
