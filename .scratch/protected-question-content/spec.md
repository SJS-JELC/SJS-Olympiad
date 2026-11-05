# Protected question content

Status: Complete locally and accepted by root after independent reviews/rechecks. No deployment authorised or performed.

## Authority and outcome

The user requests a plan to keep decorative header artworks public and deliver the remaining competition question content through the API on first opening. Earlier agreement requires competition login and the server's opening time. Planning is authorised; no deployment or cloud changes are authorised.

Delegation choice: root plus one foreman, with bounded implementation workers and independent reviewers as specified in [the implementation plan](implementation-plan.md). The user requested this delegated delivery plan; no agents are launched during planning.

## Content boundary

- Keep an explicit allowlist of decorative header artwork public, alongside generic controls, styles, fonts and reusable rendering/editor code. Classify by purpose, not file type or folder. Artwork containing question clues or diagrams is protected even if currently displayed in a header.
- Extract all 35 theory questions' confidential prompts, scientific diagrams, tables, examples, labels, structures and question-specific data into server-owned, versioned presentation records. Include accessible text and SVG content. Public renderers must not embed equivalent copies or revealing question-specific literals.
- Include the three practical protocols and scientific content under their separate practical windows. Their decorative header artwork can remain public.
- Keep the public readiness pilot independently usable. Its intentional Funny Bones content is an explicit public exception; shared code must not expose other competition content.
- Keep private answer keys, evaluation, scoring, clocks and authority server-side. Presentation records are explicitly allowlisted data, never serialized marker modules or arbitrary executable code.

## Delivery and authorization

- Add a read-only question-content API contract with question ID, content version and typed presentation data. Protected assets use authenticated API delivery, or are included in that payload where appropriate. No public fallback or public copies.
- On each content or asset request, authenticate the session and enforce role, event/year/question membership, current team claim and security generation, and the server-side theory/practical window. Competitors cannot choose another event through request parameters.
- Apply start-time protection to draft competitors as well as active competitors, superseding the current draft early-access exception for content. Teacher previews retain explicit authorised access outside event windows, including catalogue preview contexts, without score writes.
- Audit GO/resume/hydrate and every existing question/custom endpoint. Pre-start status hydration may retain approved scores, revisions and timing metadata, but must not carry confidential presentation or custom data. Dynamic reveal data remains governed by its existing game rules and must not be included prematurely in static presentation records.
- Use no-store for protected responses, including asset responses. Keep content out of public build output, source maps, public asset manifests, logs and offline/service-worker caches. Do not rely on filenames, hidden routes or frontend time checks for secrecy.

## First-open behaviour

- Opening a question triggers its content fetch; do not prefetch the entire year. Fetch its protected assets only when that question needs them. Reuse existing status hydration without conflating state-loaded and content-loaded.
- Deduplicate simultaneous requests. Cache successfully loaded presentation and asset blobs only in page memory, keyed by authenticated context, event, question and content version. Reopening within the same authorised visit reuses it, preserving answer working and avoiding duplicate transfers.
- Show an accessible loading state and explicit retry on failure. Never mark failed loads as cached; never start timed challenges merely by fetching content.
- Gates still hide cached content on deadline or loss of authority. Clear protected content and revoke asset blob URLs on logout, account/team/event context replacement, security lock or session expiry. Recovery starts a fresh authorised content load. Reload already signs users out and discards page memory.
- Fence late responses so logout, lock, event switch or a deadline crossed during loading cannot repopulate or display protected content. Preserve existing server error handling and local deadline gating; no new periodic polling.
- Cached content is a snapshot for that visit. Version records/assets consistently; do not silently mix old content with new assets. Do not promise immediate remote revocation or retraction of copies already received.

## Implementation sequence

1. Inventory all presentation dependencies and classify public artwork versus protected content, including practicals and all pre-start API responses. Record the exact content/asset contract and baseline transfer sizes.
2. Implement typed server presentation records, authenticated content/asset delivery, timing checks and first-open client loading using one representative question; validate the end-to-end boundary.
3. Migrate all remaining theory questions and practicals, preserving scientific content, attribution, rendering and interaction behaviour. Remove confidential static imports and public emitted copies.
4. Complete regression and production-output verification; update current guides only when implementation matches them. Record local evidence and outstanding deployed acceptance separately.

## Acceptance gates

- Anonymous and pilot-only callers cannot obtain protected content or assets. Competitors are denied before opening (including drafts), after closing, on wrong-year/event IDs, stale claims and locked/revoked sessions. Teachers retain isolated previews. Check exact time boundaries and late responses.
- Anonymous production downloads contain no protected prompts, diagrams, structure data or duplicated accessible content. Audit the emitted import graph and assets, not just a handful of string searches; keep the existing private-marking audit.
- First opening makes the required content/asset requests; reopening makes none within the valid memory-cache context. Failure/retry, concurrent loads, reload, logout, lock/recovery, deadline and context-switch cases behave as specified.
- Preserve submission idempotency, scoring, cooldowns, timed starts, editing/undo, completion, practical saving and pilot behaviour. Run relevant API and browser regressions plus typography, typecheck and production build through local tooling.
- Inspect every migrated question/practical for scientific and visual parity. Measure actual raw/compressed payloads and simulated concurrent first-open loads. Local results do not prove Azure runtime compression, capacity or live deployment acceptance.

## Limits

Previously public builds may already have exposed these questions. This change protects future delivery; it cannot erase downloaded copies. Authorised recipients can still save or share content. Keep hosting on the existing managed API unless measured platform constraints require a separately authorised change.
