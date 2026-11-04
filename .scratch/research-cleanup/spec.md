# Research cleanup

Status: complete, 2 November 2026.

## Authority

User requested removal of research for implemented questions, then explicitly chose extraction of unused ideas and diagrams before removing the mixed Word question bank.

## Changes

- Extracted ten unimplemented drafts and topic seeds into research/Question Bank Ideas/.
- Preserved the original six-molecule alternative naming diagram byte-for-byte with source/member hashes; retained equations, scientific notation and draft incompleteness.
- Removed the mixed Question Bank.docx after extraction, the obsolete L5 practical draft, the redundant Magical Chemistry index stub and the unused legacy ethene template.
- Removed implemented Cut and Shut content from the Year 11 research file, retaining both unimplemented questions and their sources.
- Retained all fourteen future research proposals, the current undecided U5P4 draft and three proposed practicals.
- Moved the oxyanion CSV to archive/reference-data/ with an unchanged hash.
- Updated research indexes, current mark-scheme attribution and source-location guidance.
- Restored the U5P7 generator source's exact original bytes: the earlier directory cleanup had changed its historical identifier/line endings and invalidated its pinned hash.

## Verification

All local research Markdown links resolve. Ten extracted drafts plus topic seeds and an index are present. The retained image matches the original embedded media hash and was visually inspected. Stardust and Parametric Puffing equations were checked against the Word equation XML. U5P7 product generator --check passes from retained RDKit geometry. No gameplay/marking logic changed; a full app test run was not needed for this content cleanup.
