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
| Public presentation/edit state | attempts.ts and question presentation definition |
| All marking, cooldowns, saved results and once-only points | Private API question modules and transactional service |
| One-time context hydration, direct CHECK/action transport | Cloud question adapter |
| Typed definitions/views | catalog.ts |
| Shared typography | typography.css |

## Add a question

1. Copy/rename the starter's component, stylesheet and prefix. Replace EXAMPLE identity; keep missing questions unavailable until registered both publicly and on the server.
2. Define stable public field IDs and acceptsEdit rules. Implement private marking in the API, never in a browser-imported definition. Reject blanks/invalid numbers explicitly; do not convert an empty string into zero. Ordinary definitions set lockCorrectParts:false and allowIncompleteSubmission:true.
3. Put scientific content and bespoke interactions in the question folder. Preserve source geometry, Unicode and required attribution. Original Power Apps/Masters references stay read-only.
4. Wrap ordinary controls in QuestionAnswerForm. Use its disabled and onEdit callbacks; do not add a separate cooldown authority. AnswerInput owns field appearance and accessible names. Units are display-only.
5. Register definition and View in catalog.ts. Reuse the router shell/gate; never add a nested security provider or bypass restoration/lock checks.
6. Add independent accepted/rejected server fixtures and tests. Cover blank attempts, exact cooldown boundaries, replay/concurrent submissions and once-only scoring. Test role/event/year/claim/security fencing and preview isolation. Maintain integrity expectations for trusted imported assets and inspect the production bundle for private-data leakage.

Check remains clickable during cooldown without restarting deadlines. Confirmed completion freezes the question controls and cannot award again. Inputs disable uniformly. Wrong feedback derives from retryAt: five seconds solid cross, half-second fade, shared TIME OUT liquid fill. Do not reveal individual correctness.

## State

Server attempts are keyed by event/team/question. GO hydrates all active-year question state/revisions and public custom data once. Teacher theory previews hydrate once per event/catalogue context. Ordinary edits and navigation stay in memory, with no autosave, pre-submit flush or session preflight. CHECK sends one frozen idempotent submission; uncertain retries reuse it. Reload discards unchecked answers and undo, signs competitors out and retains server-acknowledged results for a later authorized claim. Never persist editor history as a scoring payload.

Custom client reducers update presentation only. Oxyanion selection, step and timeout are server-owned; return only the current formula and reveal its name only on timeout. GC keeps the recipe private and supplies authorized trace data; experiments remain optional for marking. Grouping validates exact unique items order-independently. Local ticks animate deadlines without repeated network requests. See api-contract.md and azure-backend-pilot.md.

Overall event availability and theory availability are separate. Claims/fullscreen entry may precede theory; actual theory submissions and custom actions require its window. Authorized GO hydration may precede it, while the UI keeps actual content gated until opening. Use server-adjusted time; a scheduled close hides question content without simulating a security breach. Teacher previews remain unscored and independent of competition timing.

## Layout

Keep header, content pane and answer actions separate. Title uses shared 4.6svh uppercase Heading and a 1svh gap owned by the header. Text-only prompts fit content with a 65ch paragraph cap. Diagrams occupy remaining bounded space without stretching; U6P1 explicitly permits X-only magnification with unchanged Y scale. Only the content pane scrolls.

QuestionAnswerForm owns action layout. Check artwork is 8svh high with its bottom 2.5svh above the viewport bottom, in flow. Use layout="inline" when answers share the row. Feedback/status must not shift pane geometry. AnswerInput focuses once on entry; timed L6P3 focuses on GO. Preserve accessible names and keyboard operation.

questions.css owns shell, pane and form defaults; AnswerInput.css owns fields; CheckButton/IncorrectFeedback own submission visuals; each question stylesheet owns composition only. Consolidate rules instead of appending overrides. Follow typography.md for all live text. Keep reduced-motion fallbacks and original source assets/required generator inputs.

Typography and control geometry scale with viewport height at 1920×1080 and 2560×1440, retaining smaller landscape layouts. Avoid maximum pixel font caps that stop growth on taller screens. Scale scientific SVG user coordinates through the viewport/camera. Share pane border/radius and neutral ordinary button tokens; preserve original Challenge/Check artwork and the animated Score flip cards.

## Bespoke interactions

Grouping is limited to L5P9/L6P1; timed oxyanions, U5 drawing editors, GC laboratory and numeric questions retain their contracts in AGENTS.md. U5P7 is Cut and Shut (two points), U5P8 is Boundaries (three). Current U5 slots are 2, 3, 5, 6, 7, 8; other slots remain unavailable.

P2/P3 share view controls while retaining their own chemistry engines. Camera movement is presentation-only and must not alter answers, history or world editing limits. P3 cleanup fits the returned graph without adding atoms/H or introducing an extra undo step. P7 reuses the molecule editor with its own 40-heavy-atom policy, while P3 stays at 20; plural `drawings` supports dual legacy/new serialization and local-history compaction. RDKit product generation uses scripts/generate-u5p7-products.py and retained source/provenance, with no browser RDKit runtime.

CloudQuestion freezes every view interaction after confirmed completion, using a disabled fieldset plus pointer/keyboard/focus guards for custom SVG controls while preserving readable content. Keep header navigation and the shared stamp outside that lock; completed server state/revision is immutable and completed custom timers stop issuing actions. Teacher problem screens show the back arrow only and omit routine bottom badges/status, retaining pending/failure/retry feedback. Teacher settings controls remain on splash and theory hub.

## Practical

Practical protocols use the shared backdrop/header with a scrollable full-width instruction pane and bottom response inputs. Preserve protocol words and scientific notation while normalizing paragraph spacing. Competitor fields autosave independently with no scoring or irreversible submit; response4 remains the final-result field internally, with ordinary field styling and no extra Final answer heading. Teacher practical inputs are local-only and neither submit nor block navigation. There is no U5 practical. See api-contract.md for response IDs and persistence.

## Validation

For future changes run focused marking tests, typography audit, typecheck and build unless instructed otherwise. Browser checks should cover changed layout and gating/navigation/cooldown behaviour. Security-controller changes require broader persistence/interruption/race checks. Keep screenshots in ignored test output. Report unrun or failing checks accurately; local/mock success does not establish live Azure acceptance.
