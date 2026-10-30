# Cut and Shut mark scheme

The larger product has the carbon edges A-1-2-3-4-C-6, with branch 2-B-8. D is the formaldehyde carbon. Remove the oxygen atoms, then join carbonyl carbons in pairs with double bonds.

| Double-bond pairs | Ring size |
| --- | --- |
| D-A and B-C | 5 |
| D-B and A-C | 6 |
| D-C and A-B | 4 |

All three have ten carbons, sixteen inferred hydrogens and two double bonds. These exhaust the three pairings of the four carbonyl sites. The editor marks connectivity rather than coordinates; all three distinct graphs are required, with no extra nonblank candidates. Blank submissions are wrong, cooldown is twenty seconds, and two points are awarded once.

## Displayed products and shared drawing canvas

The two fixed products remain methanal and `OHC–CH₂–CH[C(=O)CH₃]–CH₂–CH₂–C(=O)–CH₃`. The illustration shows every C, H and O atom. `scripts/generate-u5p7-products.py` uses the installed, version-checked RDKit 2025.09.1 to generate static bond geometry plus live-label coordinates from `src/questions/u5p7/assets/ozonolysis-products.source.json`. Run it with `--check` to verify reproduction. Product formula checks, source mapping, settings, licensing and output hashes are retained in the adjacent provenance file. No answer structures are inputs to the public generator.

Students use the same displayed-formula editor as U5P3, with C/H/O tools and all three disconnected candidate structures on one canvas. Cleanup moves existing atoms only. The private marker validates the original drawing, normalizes valid attached explicit H and implicit H, splits the canvas into components and requires one of each existing accepted carbon graph. Duplicate candidates, additional fragments, oxygen, charges, valence errors and altered connectivity fail. Component order, IDs, orientation and coordinates do not affect correctness. The P7 editor allows 40 heavy atoms, 100 total atoms and 150 bonds; U5P3 retains its original bounds.

The saved field remains `drawings`. New semantic molecule snapshots and legacy `{graphs, selected}` snapshots are both accepted. The legacy adapter uniquely remaps IDs and separates old slots without changing bonds or writing on load. An oversized valid legacy drawing is retained and shown read-only rather than truncated. Undo is local and removed from both client and server snapshots; the existing 24KB service bound stays unchanged.

Source: Other/Year 11 Draft Questions.md. Chemistry reference: https://ursula.chem.yale.edu/~chem220/chem220js/STUDYAIDS/mevalonate/ozonolysis/Oz.html

Boundaries is now U5P8, worth three points, accepting 159.5 or 308.3 cubic centimetres.
