# Question starter

This folder is typechecked but **not registered, routed, scored or shown on the hub**.
Copy it to a named question folder; never add this example unchanged to the catalogue.

1. Replace the EXAMPLE identity, title, year, number, points, cooldown and dummy answer 42.
2. Author content and inputs in StarterQuestion.tsx; rename component and CSS prefix. Choose compact content-height prompts, aligned diagrams/answers or a dense bounded layout; reserve controls outside the pane.
3. Match field IDs between parts, evaluate and the view. Numeric/free-text rules belong in the definition.
4. Preserve QuestionAnswerForm for submit, cooldown, cross and liquid-fill Check behaviour.
5. Register definition and view in ../catalog.ts. The existing router owns QuestionShell and QuestionGate; do not nest another provider or backdrop.
6. Add marking cases and check the two supported landscape endpoints and a zoomed viewport.

Use AnswerInput for consistent fields, optionally unit="°" for integer angles. Use AnswerPart only for paired-angle questions. Replace the answer composition for richer interactions; do not copy L6P5's molecular coordinates.

The authoritative guide is ../../../docs/question-framework.md.
