// Settings are normalized in memory. Reading a legacy event never migrates rows.
export function eventTiming(event) {
  const theoryEndsAt = event.theoryEndsAt ?? event.endsAt;
  const theoryStartsAt = event.theoryStartsAt ?? null;
  const practicalStartsAt = event.practicalStartsAt ?? null;
  const practicalEndsAt = event.practicalEndsAt ?? null;
  return { ...event, theoryStartsAt, theoryEndsAt, practicalStartsAt, practicalEndsAt,
    endsAt: Math.max(theoryEndsAt, practicalEndsAt ?? theoryEndsAt) };
}

export const eventAvailable = (event, now) => event.status === 'active' && now < eventTiming(event).endsAt;
export function theoryAvailable(event, now) {
  const timing = eventTiming(event);
  return eventAvailable(timing, now) && (timing.theoryStartsAt === null || now >= timing.theoryStartsAt) && now < timing.theoryEndsAt;
}

/** New schedules require a theory pair; null start is reserved for legacy events. */
export function updateTiming(event, input, create = false) {
  const keys = ['theoryStartsAt', 'theoryEndsAt', 'practicalStartsAt', 'practicalEndsAt'];
  const edited = create || keys.some(key => Object.hasOwn(input, key));
  if (!edited) return eventTiming(event);
  const next = { ...eventTiming(event), ...Object.fromEntries(keys.filter(key => Object.hasOwn(input, key)).map(key => [key, input[key]])) };
  const instant = value => Number.isSafeInteger(value) && Math.abs(value) <= 8640000000000000;
  if (!instant(next.theoryStartsAt) || !instant(next.theoryEndsAt) || next.theoryStartsAt >= next.theoryEndsAt)
    throw new Error('Enter a theory start before its end.');
  const noPractical = next.practicalStartsAt === null && next.practicalEndsAt === null;
  if (!noPractical && (!instant(next.practicalStartsAt) || !instant(next.practicalEndsAt) || next.practicalStartsAt >= next.practicalEndsAt))
    throw new Error('Enter both practical times, with the start before the end, or leave both blank.');
  return eventTiming(next);
}
