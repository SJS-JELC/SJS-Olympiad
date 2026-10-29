# AGENTS.md

## Scope

This folder is an independent React, TypeScript and Vite application. It supersedes the inherited Power Apps manual-paste workflow here: do not create appCodex exports or edit original Power Apps files. The parent Olympiad folder and the separate Masters of Chemistry project are read-only references. Do not import personal/team data.

There are 33 registered questions: L5/L6/U6 slots 1–9 and U5 slots 2, 3, 5, 6, 7, 8. L6 is the default selected year. Invalid years and missing slots show unavailable content. Practical remains visual-only. Production event timing and a complete competition backend are not implemented.

## Azure pilot and data

Azure Static Web Apps hosts olympiad.masters-of-chemistry.app / lively-coast-06a373f0f.2.azurestaticapps.net. `api/` runs Node 22 managed Functions against Table Storage account sjsolympiaddata in UK South; frontend tooling uses Node 24. Follow docs/azure-backend-pilot.md for required settings and acceptance limitations. Never disclose connection strings or store them in source, chat, frontend variables or logs.

Only L6P8 uses server marking through CloudQuestion, inside the existing shell/gate. Keep its answer out of the frontend evaluator and bundle; no local marking fallback or local point award. Preserve server-authoritative 15-second cooldown, three-point award, idempotent submissions, atomic team claims and transactional attempt/score updates. Only three synthetic team slots are seeded. There is no public staff reset/recovery endpoint. Browser lock state is not yet enforced by the API. Other questions and mixed hub scores remain local demonstrations. Actual Azure storage/runtime acceptance is still unverified.

The validation workflow and Azure deployment workflow are independent. Do not infer publication or live cloud acceptance from local checks. No credentials belong in PR preview environments unless isolated test storage/settings are provisioned.

## Security contracts

Use exactly NOT_STARTED, ACTIVE and LOCKED. Keep one CompetitionSecurityProvider and one OlympiadBackground at the root. Query navigation uses history without reloading, preserving fullscreen, provider state and attempts.

- Validate persisted state before exposing question content. Restore persisted ACTIVE as LOCKED.
- Healthy idle NOT_STARTED and ACTIVE may access questions. Restoration, transitions, unhealthy storage and LOCKED must synchronously unmount actual question content.
- While ACTIVE, hidden document, blur and fullscreen exit synchronously lock without awaiting persistence.
- Entry/unlock requires a guarded user gesture and successful fullscreen. Unlock also verifies the staff PIN. Persist successful transitions before exposing content; failed persistence keeps content gated.
- Revalidate asynchronous entry/unlock work; stale/interrupted attempts cannot activate content.
- Persist session and diagnostic events atomically in one localStorage snapshot. Unlock/end must include their event in that same snapshot. External/cross-tab updates cannot activate/unlock; conflicting state conservatively preserves locking.
- LOCKED retains the inert, dimmed/blurred non-sensitive route shell beneath the root BreachModal. Keep its trapped focus, masked PIN field, in-dialog errors and exact COMPETITION MODE BREACHED heading. Escape/outside clicks/navigation cannot dismiss it.
- Staff end uses the same PIN, appends COMPETITION_ENDED, clears session timing/lock fields, persists NOT_STARTED, exits fullscreen and returns to landing. Failed saves remain locked. Local fullscreen/blur during ending is ignored; external storage updates still invalidate it.
- Keep diagnostics free of sensitive data/question content. Prepare the looping breach alarm in the entry gesture; stop on unlock/end. Audio delivery remains browser-dependent.

PIN 1234, browser events and editable localStorage are a security demonstration, not production authentication or guaranteed device lockdown. Do not overstate tab monitoring, event delivery or cross-tab atomicity.

## Question architecture and marking

Follow docs/question-framework.md and src/questions/_starter. Register definitions/views in catalog.ts; keep bespoke content in its question folder. QuestionShell/QuestionGate belong to the router. QuestionAnswerForm owns shared display/submission/editing; attempts.ts owns local marking transitions and once-only scoring.

New ordinary questions explicitly use lockCorrectParts:false and allowIncompleteSubmission:true. Check is always clickable; blank submissions are wrong outside cooldown. Repeat clicks during cooldown/after solving cannot restart deadlines or award again. Disable all answer fields uniformly during cooldown/after solving; do not expose individual correctness. Cross lasts five seconds plus a half-second fade, driven by retryAt. TIME OUT uses the shared clipped green liquid fill, without a separate countdown.

Router-owned attempts survive navigation and lock/unlock, reset on reload, and are separated by full year/question identity. Custom reducers keep interaction state in Attempt.interaction; the root tick reconciles absolute deadlines while views are unmounted. Cloud attempts use server authority instead.

## Layout, typography and assets

- Landscape 3:2–16:9 only. Keep one fixed backdrop with the established palette, blue textured floor, cracks and graphene lattice (30.375svh × 17.5365svh), and existing landing/logo proportions. Preserve reduced-motion variants.
- Shared shell: eagle/headerArtwork, white uppercase title pane, Score upper-left and original back arrow rotated 180 degrees upper-right. Header bottom margin owns the 1svh gap. Title size is 4.6svh even when wrapping. Text prompts stay top-aligned/content-sized with a 65ch paragraph cap; diagrams use available bounded space with geometry intact. Only the question pane scrolls.
- Answers are unboxed below the pane. AnswerInput owns white fill, thick black border and centered text, labels and display-only units. First enabled answer focuses once on entry; L6P3 focuses on GO. Keep ordinary borders and keyboard operation but no focus rings/outlines per user preference.
- Check artwork is 8svh high, ending 2.5svh above the viewport bottom in layout flow. Do not move it with per-question bottom padding, absolute positions or transforms. Use inline form layout for adjacent answers/Check. Feedback must not shift the pane.
- Exactly six public typography roles in typography.css: type-display, type-outlined, type-heading, type-body, type-label, type-caption. All font declarations stay there; components may set text-size/leading variables. Tilt Neon is body/field/label; 04b_19 is display only. See docs/typography.md.
- Shared Score uses two zero-padded Tilt Neon flip cards (00–99; invalid --), one accessible announcement and reduced motion. score-position inside score-page is top 4.3svh/left 15.25vw; digits 9svh and label shadow .375svh. No per-screen offsets.
- Preserve original scientific assets, scientific Unicode and UTF-8. L5/U5 divided units use slash notation such as mol/dm³, mol/s, g/mol; preserve ionic charges and scientific powers. L6/U6 notation is unchanged.
- Retain current attribution/licensing records beside assets/editors, and required generator inputs. ScientificDiagram uses live labels over preserved geometry. Regenerate floor/logo/Newman derivatives through existing scripts; durable logo changes belong in its generator. Keep eagle silhouette/asymmetry and original artwork intact. Landing bubbles remain independently clipped with restored static artwork for reduced motion.
- Consolidate existing CSS instead of stacking overrides. questions.css owns shell/pane/forms; shared field/action CSS owns those controls; question CSS owns composition only.

## Question-specific contracts

- Only L5P9 and L6P1 use GroupingQuestion: square fitted tiles, original group colours, accessible group names, no visible numbers/disabled greying, reset artwork beside Check. L6P1 symbols have equal cap height and extra padding. U6P9 retains dropdowns.
- L6P3: GO/SUBMIT timed oxyanions, four random CSV rows 16–60 plus one final row 2–15, 75-second run, wrong cross 500ms without names/commentary, timeout reveals only the current answer, 20-second GO cooldown and one point. Rounded timer/progress bars preserve approved phase colours; no clock text.
- L6P5: exact angle pairs 300/60, 300/120, 60/240, 20-second cooldown and two points. No per-molecule feedback/locking. Three answer columns align beneath molecules; shared labels once at left, degree signs visible. Keep its coordinates local.
- U6P1: original spectrum with X-only detail magnification, unchanged Y scale/height, no vertical pan/zoom, clamped accessible overview selection; no instruction text/sliders. U6P8: semantic source-data table, preserved scientific notation, fitted white cells. Best-effort drag/context-menu suppression is not browser-extension protection.
- U5P2: both main N≡N–O / N=N=O contributors on one white N/O dot-cross canvas. Exactly two disconnected components, one each; strict electron-origin counts with independent global dot/cross interchange. No charges or third contributor required. Preserve diagram/history and direct keyboard handling; one point, 20 seconds.
- U5P3: reusable molecule editor, C/H/F/Cl, displayed formulae with every drawn atom labelled including C. Users draw H explicitly; cleanup must not insert atoms/hydrogens. Preserve drawing/undo through navigation, locks and cooldown. Accept precisely the four source alkene graphs independent of layout/orientation/order and explicit/implicit H; reject fragments, duplicates, valence errors and positional isomers. No monomer-count hint. Source polymer graph stays exact. One point, 20 seconds.
- U5P5: deterministic fictitious GC laboratory, fixed injection/omitted solvent/linear response/%v/v assumptions explicit. Mystery stays undiluted; Citrus/Floral/Woody have half-percent ethanol sliders. Load before Run; keep eight immutable concentration snapshots, replacing oldest. Router owns absolute run deadlines, report positions/stacking, captured colours and formulation state. Reports drag, enlarge and delete locally; integration boundaries support pointer/keyboard with no numeric fields. Keep area explanation and a.u.·min units. Formulation has three divider handles and integer half-percent units totalling 200. No calibration/automatic correctness; edits disable during cooldown while lab remains usable. Two points, 20 seconds.
- U5P6: ideal rotatable cube, 154 pm edges and radial 109 pm C-H bonds; SVG depth order, pointer/arrows, Home/Reset. Rotation is presentation-only. Original PNG remains reference; accepts 485, two points, 20 seconds.
- U5P7 Cut and Shut: draw all three frameworks matching ozonolysis products, connectivity-based matching; two points, 20 seconds. See current mark scheme.
- U5P8 Boundaries: accepts 159.5 or 308.3 cm³, three points, 20 seconds. Prompt asks for volume without smallest. Preserve 10.0 cm diameter and 1.4/2.0 cm layer dimensions, opposing arrowheads, and accessible spherical-cap reference containing no worked hints. Never restore legacy 0.0325.

## Validation and collaboration

Use relevant tests, typography audit, typecheck and build for future implementation work unless the user instructs otherwise. Security changes require interruption, persistence-failure, stale-transition, reload and cross-tab checks; question changes require blank/cooldown/repeat-award/navigation/gating coverage. Do not claim runtime/cloud checks from static inspection. Store test screenshots in ignored output, not docs. Independent regression cases belong in tests/fixtures, separate from runtime marking.

For authorised multi-agent work, use the user-approved plan, foreman and disjoint ownership. Coordinate before touching another worker's files. Keep concise current guides consistent with behaviour; do not recreate historical migration logs, evidence galleries or archived plans.
