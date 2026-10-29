# Building questions

Read AGENTS.md for security, marking and approved layout contracts. Copy src/questions/_starter into a named folder; it is typechecked but deliberately unregistered. L6P5 is the ordinary paired-angle example.

## Ownership

| Responsibility | Owner |
| --- | --- |
| Header, Score, back navigation | QuestionShell supplied by router |
| Content access and lock gating | Root provider and QuestionGate |
| Ordinary answer form, entry focus, display clock, feedback | QuestionAnswerForm |
| Field appearance and display-only suffix | AnswerInput |
| Paired angles | AnswerPart (L6P5 adapter) |
| Local marking/state/once-only points | attempts.ts and question definition |
| Server-marked L6P8 | CloudQuestion and api/ |
| Typed definitions/views | catalog.ts |
| Shared typography | typography.css |

## Add a question

1. Copy/rename the starter's component, stylesheet and prefix. Replace EXAMPLE identity and dummy key; keep missing questions unavailable until registered.
2. Define stable field IDs, acceptsEdit and evaluate rules. Reject blanks/invalid numbers explicitly; do not convert an empty string into zero. Ordinary definitions set lockCorrectParts:false and allowIncompleteSubmission:true.
3. Put scientific content and bespoke interactions in the question folder. Preserve source geometry, Unicode and required attribution. Original Power Apps/Masters references stay read-only.
4. Wrap ordinary controls in QuestionAnswerForm. Use its disabled and onEdit callbacks; do not add a separate cooldown authority. AnswerInput owns field appearance and accessible names. Units are display-only.
5. Register definition and View in catalog.ts. Reuse the router shell/gate; never add a nested security provider or bypass restoration/lock checks.
6. Add independent accepted/rejected cases in tests/fixtures or focused tests. Cover blank attempts, exact cooldown boundaries, repeated submissions and once-only scoring. Maintain integrity expectations for trusted imported assets.

Check remains clickable during cooldown/after solving, without restarting deadlines or awarding again. Inputs disable uniformly. Wrong feedback derives from retryAt: five seconds solid cross, half-second fade, shared TIME OUT liquid fill. Do not reveal individual correctness.

## State

Router-owned attempts use full year/question IDs. Answers, drawings/history and local results survive internal navigation and locks but reset on reload. Selected year preference is separate. Custom reducers keep interaction in Attempt.interaction; the root tick reconciles absolute deadlines even while hidden. Views present progress only.

L6P8 is the exception: server-side attempts/cooldown/points and saved results come through CloudQuestion/API, without local fallback or a frontend answer key. Other questions retain inspectable local grading. There is no full event backend, durable local gameplay or server enforcement of browser lock state. See azure-backend-pilot.md.

## Layout

Keep header, content pane and answer actions separate. Title uses shared 4.6svh uppercase Heading and a 1svh gap owned by the header. Text-only prompts fit content with a 65ch paragraph cap. Diagrams occupy remaining bounded space without stretching; U6P1 explicitly permits X-only magnification with unchanged Y scale. Only the content pane scrolls.

QuestionAnswerForm owns action layout. Check artwork is 8svh high with its bottom 2.5svh above the viewport bottom, in flow. Use layout="inline" when answers share the row. Feedback/status must not shift pane geometry. AnswerInput focuses once on entry; timed L6P3 focuses on GO. Preserve accessible names and keyboard operation.

questions.css owns shell, pane and form defaults; AnswerInput.css owns fields; CheckButton/IncorrectFeedback own submission visuals; each question stylesheet owns composition only. Consolidate rules instead of appending overrides. Follow typography.md for all live text. Keep reduced-motion fallbacks and original source assets/required generator inputs.

## Bespoke interactions

Grouping is limited to L5P9/L6P1; timed oxyanions, U5 drawing editors, GC laboratory and numeric questions retain their contracts in AGENTS.md. U5P7 is Cut and Shut (two points), U5P8 is Boundaries (three). Current U5 slots are 2, 3, 5, 6, 7, 8; other slots remain unavailable.

## Validation

For future changes run focused marking tests, typography audit, typecheck and build unless instructed otherwise. Browser checks should cover changed layout and gating/navigation/cooldown behaviour. Security-controller changes require broader persistence/interruption/race checks. Keep screenshots in ignored test output. Report unrun or failing checks accurately; local/mock success does not establish live Azure acceptance.
