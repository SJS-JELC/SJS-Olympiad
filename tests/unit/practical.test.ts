import { describe, expect, it } from 'vitest';
import { practicalCatalog, validPracticalNumber } from '../../src/practicals/catalog';
import { practicalPhase } from '../../src/events/timing';

describe('practical presentation contract', () => {
  it('registers only the three original practicals with final response 4 and the two-field Mohr mapping', () => {
    expect(practicalCatalog.map(item => item.year)).toEqual(['L5', 'L6', 'U6']);
    expect(practicalCatalog.every(item => item.fields.at(-1)?.key === 'numPracticalResponse4')).toBe(true);
    expect(practicalCatalog[1].fields.map(item => item.key)).toEqual(['numPracticalResponse3', 'numPracticalResponse4']);
    expect(practicalCatalog[0].protocol).toContain('114 cm³ of 2 mol/dm³ HCl');
    expect(practicalCatalog[0].protocol).toContain('250 cm³ volumetric flask');
    expect(practicalCatalog[2].protocol).toContain('0.217M KIO₄');
  });
  it.each(['0', '-0', '0.2500', '2.50e-4', '+.50', ' 1.200 ', '1e100'])('accepts finite numeric/scientific input %s', text => expect(validPracticalNumber(text)).toBe(true));
  it.each(['', ' ', '-', '1e', '1e-', 'Infinity', 'NaN', '1,2', '0x10', '1e101', '1e-999', '1'.repeat(81)])('keeps invalid or incomplete input local: %s', text => expect(validPracticalNumber(text)).toBe(false));
  it('gates practical independently from theory at exact boundaries', () => {
    const event = { id: 'e', name: 'e', year: 'L6', status: 'active' as const, revision: 1, endsAt: 500, theoryStartsAt: 300, theoryEndsAt: 500, practicalStartsAt: 100, practicalEndsAt: 200 };
    expect(practicalPhase(event, 99)).toBe('waiting');
    expect(practicalPhase(event, 100)).toBe('open');
    expect(practicalPhase(event, 200)).toBe('closed');
    expect(practicalPhase({ ...event, practicalStartsAt: null }, 150)).toBe('closed');
  });
});
