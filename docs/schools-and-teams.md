# Schools and teams

Teachers manage schools and teams under Settings → Events. Select the event before changing its roster.

## Add teams

Create a school once, or select an existing school. Enter its **Target team count**, then select **Set team count**. The default is two teams, or four for the host school. Each target is editable from 1 to 50. The target counts current teams in that event, not additional teams to append. Existing gameplay and claims remain intact.

Teams display as the current school name followed by their number, including team 1. New numbers are higher than all numbers previously allocated to that school in the event. Deletion and removal never release a number. Use the existing individual Delete actions and confirmations to reduce the current count; setting a smaller target does not delete anything.

Every new event starts with four host teams. Existing events remain unchanged until staff explicitly manage their roster. If storage or the network interrupts setup, saved progress is shown with **Resume team setup** or **Resume host setup**. Retry controls preserve the original request. Finish pending setup before activating or changing the year. A failure can leave some teams saved; no automatic rollback deletes them.

## Existing and historical teams

Unlinked teams retain their original names and permanent IDs. **Link school** assigns an existing unlinked team to a school and an explicitly chosen unused positive team number. Linking preserves its score, saved results, claim and security state. It is available only for unfinished events. Unused numbers skipped below the high-water mark may be assigned manually; generated numbers always increase.

Teacher results group individual teams by school; unlinked teams have a separate group. Competitors still choose individual teams, and the leaderboard still ranks individual teams.

**Rename selected school** changes the shared name in all events, including completed results. Linked display names are derived on API reads. Already-rendered competitor labels update with the next session snapshot; there is no added polling. School IDs, team IDs and gameplay are unchanged. School names must be unique and at most 70 characters. There is no school deletion operation.

Completed rosters remain read-only. Global school renaming remains available. A confirmed year reset preserves school links, permanent team IDs and number reservations, while clearing gameplay and claims as before. If staging fails, **Resume year reset** uses its saved validated input; further event/roster edits are blocked until it finishes.

## Storage and verification

`api/src/schools.mjs` owns the shared directory and allocation plans. `api/src/service.mjs` owns authentication, event lifecycle, derived projections and gameplay integration. All mutations remain teacher-only; competitor team responses continue to exclude scores, practical records, submitted-activity flags and security internals.

Request IDs bind setup input, and school/event creation retries recover committed work. New teams use IDs independent of names. Existing `team-add` remains available for compatibility and retains the guarded legacy lifecycle; the teacher UI uses schools instead.

Local fault-injection and concurrency tests use only isolated synthetic data. Neither those tests nor static checks prove live Azure runtime acceptance.
