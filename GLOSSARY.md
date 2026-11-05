# Domain vocabulary

| Term | Meaning |
| --- | --- |
| School | A shared institution with a permanent `schoolId`, current name and `isHostSchool` flag. The host starts as St John's. Renaming preserves its identity. |
| Team | An event-bound gameplay identity with a permanent team ID. A linked team has one school and an event-specific team number; an unlinked legacy team retains its original name. |
| Team display name | The current school name followed by a space and team number. It is derived when read, including historical results and claimed-team snapshots. It is not an identity or a frozen name. |
| Target team count | The desired number of current, nonremoved teams for one school in the selected event, from 1 to 50. Increasing creates missing teams; reducing requires guarded deletion. |
| Allocation | A permanently reserved number and team ID in an event/school roster. Removed or deleted teams do not release their numbers. New generated numbers exceed every earlier allocation. |
| Team setup | A resumable, request-bound allocation plan. Its teams commit separately, so a failure can leave visible saved progress. Retrying the same plan never creates duplicates or resurrects a deleted team. |
| Host setup | The initial four-team setup for every newly created event. Existing events are not automatically populated. An incomplete setup blocks activation. |

## Pilot language

**Pilot attempt**:

One pupil browser's continuing warm-up entry for a chosen school. Returning visits retain its drawing and personal best; separate entries can share a school name. It is not a competition team and has no displayed number.

**Access confirmation**:

The first successful entry into the pilot drawing page after choosing a school. It confirms access to the activity, not a valid chemistry submission or verified school identity.

**School high score**:

The highest accepted personal best among a school's pilot attempts. The top-schools list ranks distinct schools by this value.

**Deleted school**:
A school removed from future selection whose identity and name remain attached to historical competition and pilot records.
