# Private marking modules

These plain JavaScript modules are deployed with the Node 22 API. Never import them from `src/` browser code. `questions.mjs` exposes only metadata and whole-question outcomes; individual evaluators remain internal.

The per-question modules preserve the approved question definitions' chemistry, normalization, numeric comparisons and cooldowns. `frameworks.mjs` contains Cut and Shut's three connectivity keys. The corresponding browser model contains only editing and integrity validation. Independent regression answers live in `tests/fixtures/`; `api/tests/fixtures/` retains captured legacy handlers only for write-fence regression coverage. Neither fixture directory is a runtime import.

`dot-cross-core.mjs` and `molecule-core.mjs` are unchanged copies of the existing public generic graph engines. Their original attribution and source records remain in `src/components/dot-cross/provenance.json` and `src/components/molecule/provenance.json`. `molecule-validation.mjs` retains the public engine's structural checks, with server input caps applied before graph traversal and no persisted undo history. Update both copies together when changing a generic graph contract.

Run `node --test api/tests/questions.test.mjs` for the server boundary. After building, `node scripts/check-private-boundary.mjs` checks browser runtime imports, public evaluator/key identifiers and distinct private text keys in production JavaScript. It deliberately excludes ordinary numeric literals and the question's displayed polymer structure.
