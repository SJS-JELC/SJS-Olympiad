# Cut and Shut mark scheme

The larger product has the carbon edges A-1-2-3-4-C-6, with branch 2-B-8. D is the formaldehyde carbon. Remove the oxygen atoms, then join carbonyl carbons in pairs with double bonds.

| Double-bond pairs | Ring size |
| --- | --- |
| D-A and B-C | 5 |
| D-B and A-C | 6 |
| D-C and A-B | 4 |

All three have ten carbons, sixteen inferred hydrogens and two double bonds. These exhaust the three pairings of the four carbonyl sites. The editor marks connectivity rather than coordinates; all three distinct graphs are required, with no extra nonblank candidates. Blank submissions are wrong, cooldown is twenty seconds, and three points are awarded once.

## Skeletal products and shared drawing canvas

The two fixed products remain methanal and `OHC–CH₂–CH[C(=O)CH₃]–CH₂–CH₂–C(=O)–CH₃`. The current illustration uses `productGraphs.ts` to place the original source atoms in a skeletal zigzag layout without redefining connectivity. `SkeletalProducts.tsx` uses the same `Structure` renderer as the answer canvas: the nine-carbon fragment omits carbon and carbon-bound hydrogen labels, retaining all three oxygen labels. Methanal is also skeletal: the unlabelled end of its C=O double bond represents carbon with two implied hydrogens. The question briefly explains unlabelled carbon vertices, implied hydrogens and labelled heteroatoms.

Students use the shared molecule editor fixed to skeletal representation, with C/H/O tools and all three disconnected candidate structures on one canvas. Carbon labels disappear on bonding and hydrogen completion is implied. Cleanup moves existing atoms only. Existing explicit-hydrogen drawings remain valid; no atoms are stripped from pupil working merely to change representation. The private marker still normalizes valid attached explicit H and implicit H and requires the same three distinct carbon graphs. Duplicate candidates, additional fragments, oxygen, charges, valence errors and altered connectivity fail. Component order, IDs, orientation and coordinates do not affect correctness. The question retains its 40-heavy-atom, 100-total-atom and 150-bond limits; U5P3 retains its original bounds. Oversized legacy drawings stay intact/read-only, rendered skeletally.

The original displayed-formula RDKit SVG, labels, source JSON, retained base and generator remain as provenance/reference assets. `scripts/generate-u5p7-products.py --check` still verifies those historical outputs; it does not generate the current skeletal layout. The new layout imports the original fixed-product source graph and contains no answer graphs. Source hashes/licensing and generator inputs are unchanged.

The saved field remains `drawings`. New semantic molecule snapshots and legacy `{graphs, selected}` snapshots are both accepted. The legacy adapter uniquely remaps IDs and separates old slots without changing bonds or writing on load. The parser still accepts oversized valid legacy drawings read-only if present in page memory. Historical saved answers are no longer restored; storage is not rewritten by reads. Undo is local and removed from both client and server snapshots; the existing 24KB service bound stays unchanged.

Developed from the retired Cut and Shut section of the Year 11 draft. This document is the current mark scheme. The generator retains its original historical source identifier and source hash. Chemistry references: https://ursula.chem.yale.edu/~chem220/chem220js/STUDYAIDS/mevalonate/ozonolysis/Oz.html and https://pmc.ncbi.nlm.nih.gov/articles/PMC4920481/.

Boundaries is now U5P8, worth three points, accepting 159.5 or 308.3 cubic centimetres.

Cut and Shut is now U5P9. Historical `u5p7` source/generator filenames remain stable for provenance. No stored U5P7 rows or prior scores are migrated or rewritten by this change. U5P7 is unavailable for new attempts.

The answer canvas starts two Zoom out clicks below the previous default (0.8 squared, or 64% of the previous scale). Existing editor view state cannot override the question's skeletal-only representation.
