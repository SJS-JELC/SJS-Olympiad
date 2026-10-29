import { describe, expect, it } from 'vitest';
import { emptyAttempt, score, transition } from '../../src/questions/attempts';
import { u5p8 } from '../../src/questions/u5p8/definition';
import { wording } from '../../src/questions/u5p8/content';

describe('U5P8 revised Boundaries volume question', () => {
  it.each(['159.5', '159.50', '0159.5', ' 159.5 ', '308.3', '308.30', '0308.3', ' 308.3 '])('accepts equivalent numeric cm³ value %s', answer => {
    expect(u5p8.evaluate({ answer })).toEqual({ answer: true });
  });
  it.each(['', ' ', '0.0325', '159.4', '159.6', '308.2', '308.4', '159.476626', '308.293954', '0.1595', '159500', '159.5cm³', '159.5 cm3', '308.3 cm³', 'NaN', 'Infinity', '0x9f', '159.5e0', '308.3e0'])('rejects wrong or malformed value %s', answer => {
    expect(u5p8.evaluate({ answer })).toEqual({ answer: false });
  });
  it('derives both added volumes independently from the stated geometry', () => {
    const radius = 5, initialHeight = 1.4;
    const crossSection = (h: number) => Math.PI * h * (2 * radius - h);
    const capVolume = (h: number) => Math.PI * h ** 2 * (3 * radius - h) / 3;
    const firstHeight = radius - Math.sqrt(radius ** 2 - 2 * initialHeight * (2 * radius - initialHeight));
    const secondHeight = 2 * radius - firstHeight;
    const added = capVolume(firstHeight) - capVolume(initialHeight);
    expect(crossSection(initialHeight) / Math.PI).toBeCloseTo(12.04, 12);
    expect(crossSection(firstHeight)).toBeCloseTo(2 * crossSection(initialHeight), 12);
    expect(firstHeight).toBeCloseTo(4.040833695, 9);
    expect(added).toBeCloseTo(159.476626, 5);
    expect(Number(added.toFixed(1))).toBe(159.5);
    expect(crossSection(secondHeight)).toBeCloseTo(2 * crossSection(initialHeight), 12);
    expect(secondHeight).toBeCloseTo(5.959166305, 9);
    const secondAdded = capVolume(secondHeight) - capVolume(initialHeight);
    expect(secondAdded).toBeCloseTo(308.293954, 5);
    expect(Number(secondAdded.toFixed(1))).toBe(308.3);
    for (const value of [added, secondAdded]) {
      expect(u5p8.evaluate({ answer: value.toFixed(1) })).toEqual({ answer: true });
    }
  });
  it('preserves the exact four revised paragraphs without extra geometry hints', () => {
    expect(wording).toHaveLength(4);
    expect(wording[0]).toBe('Some curious reactions happen in a two-dimensional world. A nice example is the liquid interface between reagents that don’t mix, such as propyl propanoate and aqueous sodium hydroxide.');
    expect(wording[1]).toContain('2.0 cm deep, floating on a 1.4 cm deep layer of 1.00 mol/dm³');
    expect(wording[1]).toContain('0.0300 mol/s');
    expect(wording[2]).toBe('More 1.00 mol/dm³ sodium hydroxide solution is carefully added beneath the ester.');
    expect(wording[3]).toBe('What is the volume of solution that must be added to double the initial reaction rate? Give your answer in cm³ to one decimal place.');
    expect(wording.join(' ')).not.toMatch(/10\.0|spher|bottom measure|surface area|159\.5/);
  });
  it('uses one shared 20 second cooldown, rejects edits during it and awards two points once', () => {
    const wrong = transition(u5p8, emptyAttempt(), { type: 'submit', now: 100 });
    expect(wrong.retryAt).toBe(20100);
    expect(wrong.feedback).toEqual({ answer: false });
    expect(transition(u5p8, wrong, { type: 'submit', now: 1000 })).toBe(wrong);
    expect(transition(u5p8, wrong, { type: 'edit', field: 'answer', value: '159.5', now: 20099 })).toBe(wrong);
    const edited = transition(u5p8, wrong, { type: 'edit', field: 'answer', value: '159.5', now: 20100 });
    const solved = transition(u5p8, edited, { type: 'submit', now: 20100 });
    expect(solved.solvedAt).toBe(20100);
    expect(score([u5p8], { U5P8: solved })).toBe(3);
    expect(transition(u5p8, solved, { type: 'submit', now: 30100 })).toBe(solved);
    expect(transition(u5p8, solved, { type: 'edit', field: 'answer', value: '0', now: 30100 })).toBe(solved);
    expect(u5p8.lockCorrectParts).toBe(false);
    expect(u5p8.allowIncompleteSubmission).toBe(true);
  });
  it('allows decimal entry but refuses units and exponent syntax as edits', () => {
    const edit = u5p8.parts[0].fields[0].acceptsEdit!;
    expect(['', '.', '159.', '159.5'].every(edit)).toBe(true);
    expect(['159.5 cm³', '1e2', '-1', '159,5', '1.2.3'].some(edit)).toBe(false);
  });
});
