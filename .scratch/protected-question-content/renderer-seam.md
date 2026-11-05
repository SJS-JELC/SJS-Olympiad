# Frozen J02 migration seam

Status: Implemented for all 35 theory and three practical records, including the J08 strict identifier/configuration correction. Only the integration owner edits shared registry/contracts.

## Browser contract

`src/contracts/presentation.ts` is data-free. `PresentationPayload` requires `renderer` (the exact catalogue ID), `title`, and optional display-only `parts`. Each question defines and exports a local TypeScript interface extending it for its prose, tables, typed graph/geometry, labels, descriptions and examples. No scientific values belong in that interface file.

`QuestionViewProps` now includes `presentation?:LoadedPresentation`. Protected views must call `requirePresentation<LocalPayload>(presentation,'L6P5')` (substitute own ID); it returns `{record,assets}`. The record includes `kind,id,schemaVersion:1,version,serverNow,presentation,assets` (a manifest); `assets` on LoadedPresentation maps immutable asset IDs to memory-only blob URLs. Views must not fetch or import protected material and must have no static fallback. L6P5 is the representative.

Set `definition.protectedContent:true`, use neutral `Question N` title and neutral field/part labels in the public definition. Keep private protocol IDs stable but use neutral public field/part placeholders. Resolve true runtime IDs from authorized payloads, retaining positional generic edit validators. Question-specific reducer/editor/dropdown configuration is protected payload data. Presentation fields may supply `unit` and full `ariaLabel`; shared AnswerPart renders these without hardcoded scientific suffixes. `presentedDefinition(definition,record.presentation)` merges protected title/parts by position with generic public validators and configures question-specific behavior; use that result in QuestionAnswerForm/AnswerPart and CloudQuestion local editing. All scientific units, explanatory aria labels, tables, initial/example graphs and drawings belong in the payload. Public generic editor/tool labels may remain. Existing generic GroupingQuestion already accepts parameterised definition/wording/items; pass protected values and resolved blob image URLs there.

The router owns content loading/caching and supplies the protected title to the shell. `stateLoaded` and content readiness are distinct. Views mount only after selected state, content/assets and current security/window gates succeed. New content does not allocate/start timed runs. Teacher catalogue titles use authenticated `content-catalogue`; competitors never call that endpoint. Every catalogue entry is protected; the router has no static-content fallback.

## Server files

Each migration creates `api/src/presentation/records/<id-lowercase>.mjs` exporting `<id-lowercase>Presentation` (e.g. `l6p5Presentation`) with `{kind:'question',id:'L6P5',schemaVersion:1,version:'1',presentation:<plain payload>,assets:[...]}`. Practical records use `kind:'practical'` and ID/year `L5`, `L6`, `U6`. Version changes whenever payload/assets change. Store fixed asset files under `api/src/presentation/assets/<id-lowercase>/` and instantiate each with `fixedAsset('asset-key','image/svg+xml',new URL('../assets/l6p5/file.svg',import.meta.url))`. MIME allowlist is SVG/PNG/JPEG/WebP. Large images remain binary; geometry may instead be typed payload data for an interactive renderer. Never expose private markers/recipes/future timed prompts.

Provide a per-record `validate(presentation,assetIds:Set<string>)` function which throws for missing required renderer-specific fields/references; shared validateRecord checks common fields, parts and manifest. `fixedAsset` audits SVG for active/external content on import. Never weaken its audit for a scientific asset; simplify trusted static SVG geometry if needed and preserve visual geometry/provenance. The integration owner imports/explicitly registers records in registry.mjs. No auto-glob and no browser import of that directory. Build invokes presentation/validate.mjs.

## API and authority

POST `question-content` takes `{questionId,eventId?}`; POST `practical-content` takes `{contentId?:year,eventId?}`. Competitors derive event from owned claims; teachers may choose real event or `catalogue-L6`. POST `content-asset` takes `{kind,questionId|contentId,version,assetId,eventId?}`. Responses are real bytes, no-store/nosniff. Unknown or mismatched IDs/versions fail closed. Same role/year/claim/security/start-inclusive,end-exclusive window gates authorize record and assets. Draft starts are enforced. Teachers bypass timing only under authenticated isolated previews. Protocol content is separate from numeric practical result reads (which remain read-only after close).

ContentStore is router-lifetime page memory with authority generation, context and per-kind deadline gates, deduplicated flights, successful version pinning and revoked blob cleanup. Failed/partial loads are retryable and never cached. Lock/logout/context change abort and fence late results; recovery loads again. Clearing content never clears answer working.

Practical UI migration receives the existing router-lifetime store (`questions.content` in main.tsx) as a prop; do not create a route-lifetime store in Practical, because revisits must reuse it. Ask the shared owner/integrator for the single main.tsx prop wire-up when the component signature is ready.
