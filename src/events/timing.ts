import type { EventRecord } from '../cloud/api';

export const EVENT_TIME_ZONE = 'Europe/London';
const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: EVENT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
export function londonDateValue(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return '';
    const parts = Object.fromEntries(formatter.formatToParts(value).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** A wall time must identify exactly one London instant, including DST changes. */
export function parseLondonDate(value: string): number {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a valid date and time.');
    const base = Date.parse(value + ':00Z');
    if (!Number.isFinite(base) || new Date(base).toISOString().slice(0, 16) !== value) throw new Error('Enter a valid date and time.');
    const offsets = new Set<number>();
    for (const hours of [-36, 0, 36]) {
        const sample = base + hours * 3600000;
        offsets.add(Date.parse(londonDateValue(sample) + ':00Z') - sample);
    }
    const candidates = [...offsets].map(offset => base - offset).filter(instant => londonDateValue(instant) === value);
    if (candidates.length === 0) throw new Error('This London time does not exist because the clocks move forward. Choose another time.');
    if (candidates.length > 1) throw new Error('This London time occurs twice because the clocks move back. Choose an unambiguous time.');
    return candidates[0];
}

export function eventTiming(event: EventRecord) {
    const theoryEndsAt = event.theoryEndsAt ?? event.endsAt;
    return { theoryStartsAt: event.theoryStartsAt ?? null, theoryEndsAt,
        practicalStartsAt: event.practicalStartsAt ?? null, practicalEndsAt: event.practicalEndsAt ?? null,
        endsAt: Math.max(theoryEndsAt, event.practicalEndsAt ?? theoryEndsAt) };
}
export function theoryPhase(event: EventRecord | null | undefined, now: number): 'waiting' | 'open' | 'closed' {
    if (!event || event.status !== 'active') return 'closed';
    const timing = eventTiming(event);
    if (now >= timing.theoryEndsAt) return 'closed';
    return timing.theoryStartsAt !== null && now < timing.theoryStartsAt ? 'waiting' : 'open';
}
export function practicalPhase(event: EventRecord | null | undefined, now: number): 'waiting' | 'open' | 'closed' {
    if (!event || event.status !== 'active') return 'closed';
    const timing = eventTiming(event);
    if (timing.practicalStartsAt === null || timing.practicalEndsAt === null || now >= timing.practicalEndsAt) return 'closed';
    return now < timing.practicalStartsAt ? 'waiting' : 'open';
}
export function durationText(milliseconds: number): string {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
