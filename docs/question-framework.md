# Building questions

Read AGENTS.md for security, marking and approved layout contracts. Copy src/questions/_starter into a named folder; it is typechecked but deliberately unregistered. L6P5 is the ordinary paired-angle example.

## Ownership

| Responsibility | Owner |
| --- | --- |
| Header, Score, back navigation | QuestionShell supplied by router |
| Content access and lock gating | Root provider and QuestionGate |
| Ordinary answer form, entry focus, display clock, feedback | QuestionAnswerForm |
| Reusable illustrated action artwork | IllustratedActionButton; CheckButton owns submit/cooldown semantics |
| Field appearance and display-only suffix | AnswerInput |
| Paired angles | AnswerPart (L6P5 adapter) |
| Public edit state, validators and neutral routing | attempts.ts and question definition |
| Protected scientific presentation/assets | api/src/presentation, via contracts/presentation.ts and the router ContentStore |
| All marking, cooldowns, saved results and once-only points | Private API question modules and transactional service |
| One-time context hydration, direct CHECK/action transport | Cloud question adapter |
| Server outcome/page-working reconciliation and fresh restoration | cloud/question-state.ts, used by hydration, CHECK and test adapters |
| Typed definitions/views | catalog.ts |
| Shared typography | typography.css |

## Add a question

1. Copy/rename the starter's component, stylesheet and prefix. Replace EXAMPLE identity; keep missing questions unavailable until registered both publicly and on the server.
2. Define neutral public field/part placeholders and generic acceptsEdit rules; supply real scientific protocol IDs from authorized presentation. Implement private marking in the API, never in a browser-imported definition. Reject blanks/invalid numbers explicitly; do not convert an empty string into zero. Ordinary definitions set lockCorrectParts:false and allowIncompleteSubmission:true.
3. Keep bespoke interaction/rendering code in the question folder and put scientific content/configuration/assets in a typed server presentation record. Preserve source geometry, Unicode and required attribution. Original Power Apps/Masters references stay read-only.
4. Wrap ordinary controls in QuestionAnswerForm. Use its disabled and onEdit callbacks; do not add a separate cooldown authority. AnswerInput owns field appearance and accessible names. Units are display-only.
5. Register definition and View in catalog.ts. Reuse the router shell/gate; never add a nested security provider or bypass restoration/lock checks.
6. Add independent accepted/rejected server fixtures and tests. Cover blank attempts, exact cooldown boundaries, replay/concurrent submissions and once-only scoring. Test role/event/year/claim/security fencing and preview isolation. Maintain integrity expectations for trusted imported assets and inspect the production bundle for private-data leakage.

Check remains clickable during cooldown without restarting deadlines. Confirmed completion freezes the question controls and cannot award again. Inputs disable uniformly. Wrong feedback derives from retryAt: five seconds solid cross, half-second fade, shared TIME OUT liquid fill. Do not reveal individual correctness.

## State

Server attempts are keyed by event/team/question. GO hydrates all active-year outcomes/revisions, status metadata only, without custom interactions/data. Teacher theory previews start blank, loading selected timed/GC state when needed. Ordinary edits and navigation stay in memory, with no autosave, pre-submit flush or session preflight. CHECK sends one frozen idempotent submission; uncertain retries reuse it. Reload discards all answer working, undo, formulation and GC reports, signs competitors out and retains server-confirmed outcomes/cooldowns for a later authorized claim. Even successful answer content is not stored. Compact canonical outcome receipts and fingerprints retain idempotency; responses merge into page-local working without replacing it. Never persist editor history as a scoring payload.

Custom client reducers update presentation only. Oxyanion selection, step and timeout are server-owned; return only the current formula and reveal its name only on timeout. GC keeps the recipe private and supplies authorized trace data; experiments remain optional for marking. Grouping validates exact unique items order-independently. Local ticks animate deadlines without repeated network requests. See api-contract.md and azure-backend-pilot.md.

Overall event availability and theory availability are separate. Claims/fullscreen entry may precede theory; actual theory submissions and custom actions require its window. Authorized GO hydration may precede it, while the UI keeps actual content gated until opening. Use server-adjusted time; a scheduled close hides question content without simulating a security breach. Teacher previews remain unscored and independent of competition timing.

## Layout

Keep header, content pane and answer actions separate. Title uses shared 4.6svh uppercase Heading and a 1svh gap owned by the header. Text-only prompts fit content with a 65ch paragraph cap. Diagrams occupy remaining bounded space without stretching; U6P1 explicitly permits X-only magnification with unchanged Y scale. Only the content pane scrolls.

QuestionAnswerForm owns action layout. Check artwork is 8svh high with its bottom 2.5svh above the viewport bottom, in flow. Use layout="inline" when answers share the row. Feedback/status must not shift pane geometry. AnswerInput focuses once on entry; timed L6P3 focuses on GO. Preserve accessible names and keyboard operation.

questions.css owns shell, pane and form defaults; AnswerInput.css owns fields; CheckButton/IncorrectFeedback own submission visuals; each question stylesheet owns composition only. Consolidate rules instead of appending overrides. Follow typography.md for all live text. Keep reduced-motion fallbacks and original source assets/required generator inputs.

Typography and control geometry scale with viewport height at 1920×1080 and 2560×1440, retaining smaller landscape layouts. Avoid maximum pixel font caps that stop growth on taller screens. Scale scientific SVG user coordinates through the viewport/camera. Share pane border/radius and neutral ordinary button tokens; preserve original Challenge/Check artwork and the animated Score flip cards.

## Bespoke interactions

Grouping is used by L5P9/L6P1/U5P7; timed oxyanions, U5 drawing editors, GC laboratory and numeric questions retain their contracts in AGENTS.md. U5P9 is Cut and Shut (three points), U5P8 is Boundaries (three). Current U5 slots are 2, 3, 4, 5, 6, 7, 8, 9; other slots remain unavailable.

P2/P3 share view controls while retaining their own chemistry engines. Camera movement is presentation-only and must not alter answers, history or world editing limits. P3 cleanup fits the returned graph without adding atoms/H or introducing an extra undo step. P9 reuses the molecule editor with its own 40-heavy-atom policy, while P3 stays at 20; plural `drawings` supports dual legacy/new serialization and local-history compaction. Cut and Shut now fixes the editor to skeletal view and renders product graphs from the original source JSON using the shared Structure renderer. Historical displayed-product assets and scripts/generate-u5p7-products.py remain unchanged as provenance; there is no browser RDKit runtime.

CloudQuestion freezes every view interaction after confirmed completion, using a disabled fieldset plus pointer/keyboard/focus guards for custom SVG controls while preserving readable content. Keep header navigation and the shared stamp outside that lock; completed server state/revision is immutable and completed custom timers stop issuing actions. Teacher problem screens show the back arrow only and omit routine bottom badges/status, retaining pending/failure/retry feedback. Teacher navigation is rooted in Settings; all previews return there directly. Pupil splash and theory hub have no Settings controls.

## Practical

Practical protocols use the shared backdrop/header with a scrollable full-width instruction pane and bottom response inputs. Preserve protocol words and scientific notation while normalizing paragraph spacing. Competitor fields autosave independently with no scoring or irreversible submit; response4 remains the final-result field internally, with ordinary field styling and no extra Final answer heading. Teacher practical inputs are local-only and neither submit nor block navigation. There is no U5 practical. See api-contract.md for response IDs and persistence.

## Validation

For future changes run focused marking tests, typography audit, typecheck and build unless instructed otherwise. Browser checks should cover changed layout and gating/navigation/cooldown behaviour. Security-controller changes require broader persistence/interruption/race checks. Keep screenshots in ignored test output. Report unrun or failing checks accurately; local/mock success does not establish live Azure acceptance.

U5 P2/P3/P9 editors use a compact left palette. The rail owns its fine dividers/spacing and preserves 44px coarse-pointer targets; short touch layouts use a top-strip fallback to keep canvas height. P3/P9 answer forms use question-scoped zero horizontal padding so diagram and drawing card edges match. No injected test CSS or stored placement setting is needed.

U5P2, U5P3 and U5P9 start with two extra Zoom out steps (0.8 squared scale). This changes only their initial camera; molecular coordinates, saved working, manual zoom and Fit remain independent. The molecule editor enforces the currently permitted representation even if a mounted editor retains an earlier view preference.

## Protected presentation seam

All 35 theory and three practical presentations use the shared content loader and explicit server registry. Public definitions use neutral titles/labels/IDs and `protectedContent:true`; their views consume a typed server payload and resolved memory blob URLs through QuestionViewProps. They have no static fallback. Question state/results and presentation readiness are separate, and both plus the current security/window gate are required before mounting. The header uses the authorized title; the teacher catalogue obtains scientific titles through its authenticated metadata endpoint. Shared forms and CloudQuestion both use the effective authorized definition so genuine field IDs retain their matching generic edit validators. Per-question reducer/editor/dropdown configuration comes from the same payload. Generic mathematical rendering remains public; scientific graph coordinates, apparatus geometry and defaults do not. Question-bound chart/apparatus selectors and property keys also use neutral public names; authorized scientific labels and geometry remain exact. Private protocol IDs and fingerprints remain stable; see [ADR 0003](adr/0003-protected-runtime-identifiers.md). See [the renderer contract](../.scratch/protected-question-content/renderer-seam.md) and [API delivery](api-contract.md#protected-presentation-delivery).

Selected timed/GC state reads belong to the current authority/context generation. Lock, theory closure or context replacement invalidates obsolete selected flights so recovery/context return can read immediately; only the owning flight clears its pending slot. Late old results/errors remain fenced and learner working and frozen uncertain submissions remain in page memory.
