import { describe, expect, it } from 'vitest';
import { getComposition, getTrace, integrate, isCorrectComposition, RETENTION_TIMES, RUN_MS, SAMPLE_LABELS, SAMPLES, snapInterval, TIME_MAX, validComposition } from '../../src/questions/u5p5/model';

const peakWindow = (time: number) => [time - 0.15, time + 0.15] as const;
const closePeakWindow = (time: number) => [time - 0.099, time + 0.099] as const;

describe('U5P5 deterministic GC model', () => {
  it('keeps four samples, pure accord labels, and a six-second run', () => {
    expect(SAMPLES).toEqual(['citrus', 'floral', 'woody', 'mystery']);
    expect(SAMPLE_LABELS.citrus).toMatch(/citrus scent/i);
    expect(SAMPLE_LABELS.floral).toMatch(/floral scent/i);
    expect(SAMPLE_LABELS.woody).toMatch(/woody scent/i);
    expect(RUN_MS).toBe(6000);
    expect(TIME_MAX).toBe(5.4);
  });

  it.each([
    ['citrus', 3.4, 400],
    ['floral', 2.8, 600],
    ['woody', 4.8, 1000],
    ['mystery', 3.4, 50],
    ['mystery', 2.8, 42],
    ['mystery', 4.8, 45],
  ] as const)('integrates %s peak at %s min to %s area', (sample, time, expected) => {
    const interval = time === 3.4 ? closePeakWindow(time) : peakWindow(time);
    expect(integrate(sample, interval)).toBeCloseTo(expected, 1);
  });

  it('normalizes every pure sample to a common total response area of 2000', () => {
    for (const sample of ['citrus', 'floral', 'woody'] as const) {
      expect(integrate(sample, [0, TIME_MAX])).toBeCloseTo(2000, 1);
    }
  });

  it('adds shared peaks linearly and returns a stable noise-free trace', () => {
    const citrusFirst = integrate('citrus', peakWindow(1.1));
    const woodyFirst = integrate('woody', peakWindow(1.1));
    expect(integrate('mystery', peakWindow(1.1))).toBeCloseTo(citrusFirst * 0.125 + woodyFirst * 0.045, 1);
    const before = getTrace('mystery');
    expect(getTrace('mystery')).toBe(before);
    expect(before[0]).toEqual(getTrace('mystery')[0]);
    expect(before.at(-1)?.time).toBe(TIME_MAX);
    expect(before[1].time - before[0].time).toBeCloseTo(0.002, 8);
  });

  it('recovers all three recipe fractions and preserves the tempting shared contributions', () => {
    for (const [sample,time,fraction] of [['citrus',3.4,.125],['floral',2.8,.07],['woody',4.8,.045]] as const) {
      const interval = closePeakWindow(time);
      expect(integrate('mystery',interval)/integrate(sample,interval)).toBeCloseTo(fraction,5);
    }
    expect(integrate('mystery',peakWindow(1.1))).toBeCloseTo(136,1);
    expect(integrate('mystery',peakWindow(2.0))).toBeCloseTo(156,1);
  });

  it('integrates clipped and reversed intervals safely at the run edges', () => {
    expect(integrate('citrus', [-1, 0])).toBe(0);
    expect(integrate('citrus', [TIME_MAX, TIME_MAX + 1])).toBe(0);
    expect(integrate('citrus', [1.2, 1.0])).toBeCloseTo(integrate('citrus', [1.0, 1.2]), 9);
    expect(snapInterval([-4, -2])).toEqual([0, 0]);
    expect(snapInterval([TIME_MAX + 1, TIME_MAX + 2])).toEqual([TIME_MAX, TIME_MAX]);
  });

  it('snaps one isolated peak consistently and leaves broad or ambiguous intervals alone', () => {
    expect(snapInterval([3.36, 3.44])).toEqual([3.31, 3.49]);
    expect(snapInterval([2.78, 2.82])).toEqual([2.71, 2.89]);
    expect(snapInterval([3.1, 3.5])).toEqual([3.1, 3.5]);
    expect(snapInterval([3.29, 3.31])).toEqual([3.29, 3.31]);
    expect(snapInterval([0.2, 0.4])).toEqual([0.2, 0.4]);
  });

  it('parses JSON half-point units and defaults invalid answers', () => {
    expect(getComposition({ composition: '[25,14,9,152]' })).toEqual([25, 14, 9, 152]);
    expect(getComposition({})).toEqual([50, 50, 50, 50]);
    expect(getComposition({ composition: '[25.5,14,9,151.5]' })).toEqual([50, 50, 50, 50]);
    expect(getComposition({ composition: '[25,14,9,151]' })).toEqual([50, 50, 50, 50]);
    expect(getComposition({ composition: 'invalid' })).toEqual([50, 50, 50, 50]);
  });

  it('validates four integer half-point units totaling 200 and checks only the key', () => {
    expect(validComposition([25, 14, 9, 152])).toBe(true);
    expect(validComposition([25, 14, 9, 151])).toBe(false);
    expect(validComposition([25.5, 14, 9, 151.5])).toBe(false);
    expect(validComposition([25, 14, 9])).toBe(false);
    expect(validComposition('25,14,9,152')).toBe(false);
    expect(isCorrectComposition([25, 14, 9, 152])).toBe(true);
    expect(isCorrectComposition([25, 14, 9, 151])).toBe(false);
    expect(isCorrectComposition({})).toBe(false);
  });
});
