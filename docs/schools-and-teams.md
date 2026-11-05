# Schools and teams

Teachers manage schools and teams under Settings → Events. Select the event before changing its roster.

## School colours and selection

Select a school under Settings ? Events to edit **Number of colours** (1 or 2), **Colour 1 hex** and, for two colours, **Colour 2 hex**. Use six-digit values including `#`, then **Save school colours**. Two colours control the left and right ends; the selected top light blends between them. These shared settings apply to competition teams and pilot schools across events, including when editing from a completed event.

Saves validate on the server, check the school revision, and commit the colour change and retry receipt atomically. An uncertain save offers **Retry saving colours** with the same request. A concurrent edit requires **Reload colours** before saving again. Saved colours survive renaming. Existing records without colours use the approved preview palette on read; unknown schools and unlinked teams use purple. Reading never writes defaults or creates schools. See [asset provenance](school-selector-assets.md).

Both selectors use the same SVG tiles with tactile hover, bold wrapped names, adaptive columns and a centred incomplete last row. Selection lights the sides and top bar. Claimed competition teams have grey ends, a struck name and a CLAIMED stamp. The bright hazard **LOCK IN** button does nothing until a valid selection exists. Competition retains server claims followed by the fullscreen rules and GO; pilot retains its private attempt/recovery flow. The available LOCKED vector is for confirmed success, never a pending request.

Selector labels omit the word School and shorten Farnborough to Farnborough Sixth Form. Stored names and accessible radio names remain unchanged. There is no routine refresh button or extra selector heading; competition list failures expose Retry loading teams and claim conflicts refresh the list. The grid fits the available viewport using measured text; extremely large rosters or very small windows can require small text.

## Add teams

Create a school once, or select an existing school. Enter its **Target team count**, then select **Set team count**. The default is two teams, or four for the host school. Each target is editable from 1 to 50. The target counts current teams in that event, not additional teams to append. Existing gameplay and claims remain intact.

Team display names use the current school name followed by their number, including team 1. The settings results table separates School and Team into columns. New numbers are higher than all numbers previously allocated to that school in the event. Deletion and removal never release a number. Use individual Delete actions to reduce the current count; setting a smaller target does not delete anything.

Draft Delete has no confirmation dialog. The row disappears immediately while the server processes deletion. A failed deletion restores the row; an uncertain result offers Retry using the original request ID. Active events retain their confirmation dialog and hide the row when confirmed. Server authentication, ownership fencing and submitted-activity retention still apply. Completed events cannot delete teams.

Every new event starts with four host teams. Existing events remain unchanged until staff explicitly manage their roster. If storage or the network interrupts setup, saved progress is shown with **Resume team setup** or **Resume host setup**. Retry controls preserve the original request. Finish pending setup before activating or changing the year. A failure can leave some teams saved; no automatic rollback deletes them.

## Existing and historical teams

Unlinked teams retain their original names and permanent IDs. **Link school** assigns an existing unlinked team to a school and an explicitly chosen unused positive team number. Linking preserves its score, saved results, claim and security state. It is available only for unfinished events. Unused numbers skipped below the high-water mark may be assigned manually; generated numbers always increase.

Teacher results use one flat table without school subheaders. Linked teams show the school and numeric team number separately; unlinked teams retain their original name in the Team column with a dash for School. Practical results with no saved responses show only “–”, without an empty working disclosure or label fetch. Partial working remains expandable with a dash for a missing final response; submitted zero and precision are preserved. Competitors still choose individual teams, and the leaderboard still ranks individual teams.

**Rename selected school** changes the shared name in all events, including completed results. Linked display names are derived on API reads. Already-rendered competitor labels update with the next session snapshot; there is no added polling. School IDs, team IDs and gameplay are unchanged. School names must be unique and at most 70 characters. There is no school deletion operation.

Completed rosters remain read-only. Global school renaming remains available. A confirmed year reset preserves school links, permanent team IDs and number reservations, while clearing gameplay and claims as before. If staging fails, **Resume year reset** uses its saved validated input; further event/roster edits are blocked until it finishes.

## Storage and verification

`api/src/schools.mjs` owns the shared directory and allocation plans. `api/src/service.mjs` owns authentication, event lifecycle, derived projections and gameplay integration. All mutations remain teacher-only; competitor team responses continue to exclude scores, practical records, submitted-activity flags and security internals.

Request IDs bind setup input, and school/event creation retries recover committed work. New teams use IDs independent of names. Existing `team-add` remains available for compatibility and retains the guarded legacy lifecycle; the teacher UI uses schools instead.

Local fault-injection and concurrency tests use only isolated synthetic data. Neither those tests nor static checks prove live Azure runtime acceptance.
