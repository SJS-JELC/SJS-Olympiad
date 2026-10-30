import { describe, expect, it } from 'vitest';
import { eventTiming, londonDateValue, parseLondonDate, theoryPhase } from '../../src/events/timing';
import type { EventRecord } from '../../src/cloud/api';

describe('London event wall times', () => {
    it('converts winter and summer independently of the browser timezone', () => {
        expect(parseLondonDate('2026-01-15T12:30')).toBe(Date.parse('2026-01-15T12:30Z'));
        expect(parseLondonDate('2026-07-15T12:30')).toBe(Date.parse('2026-07-15T11:30Z'));
        expect(londonDateValue(Date.parse('2026-07-15T11:30Z'))).toBe('2026-07-15T12:30');
    });
    it('rejects both nonexistent and ambiguous DST wall times', () => {
        expect(() => parseLondonDate('2026-03-29T01:30')).toThrow(/does not exist/);
        expect(() => parseLondonDate('2026-10-25T01:30')).toThrow(/occurs twice/);
        expect(parseLondonDate('2026-10-25T02:30')).toBe(Date.parse('2026-10-25T02:30Z'));
    });
    it('rejects incomplete or impossible dates instead of normalizing them', () => {
        for (const value of ['', '2026-02-30T12:00', '2026-13-10T12:00', '2026-01-01T24:00']) expect(() => parseLondonDate(value)).toThrow();
    });
});
describe('theory window presentation', () => {
    const event: EventRecord = {id:'one',name:'Event',year:'L6',status:'active',revision:1,endsAt:500,theoryStartsAt:100,theoryEndsAt:300,practicalStartsAt:200,practicalEndsAt:500};
    it('opens inclusively and closes exclusively without using practical times', () => {
        expect(theoryPhase(event,99)).toBe('waiting'); expect(theoryPhase(event,100)).toBe('open');
        expect(theoryPhase(event,299)).toBe('open'); expect(theoryPhase(event,300)).toBe('closed');
        expect(eventTiming(event).endsAt).toBe(500);
    });
    it('preserves legacy immediate availability without modifying the record', () => {
        const legacy: EventRecord = {id:'old',name:'Legacy',year:'L6',status:'active',revision:1,endsAt:300};
        expect(theoryPhase(legacy,0)).toBe('open'); expect(eventTiming(legacy).theoryStartsAt).toBeNull();
        expect(legacy).not.toHaveProperty('theoryStartsAt');
    });
});
