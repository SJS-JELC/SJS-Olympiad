import { describe, expect, it } from 'vitest';
import { emptyAttempt, score, transition } from '../../src/questions/attempts';
import { u5p6 } from '../../src/questions/u5p6/definition';

describe('U5P6 Cubane', () => {
  it.each(['485', '485.0', '4.85e2', '+485', ' 485 '])('accepts numeric equality %j', answer => {
    expect(u5p6.evaluate({ answer })).toEqual({ answer: true });
  });

  it.each(['', '   ', '484', '486', '484.735', '485.001', '485pm', '0x1e5', 'NaN', 'Infinity', '4.85e', '485x'])('rejects blank, wrong or invalid value %j', answer => {
    expect(u5p6.evaluate({ answer })).toEqual({ answer: false });
  });

  it('rejects missing answers and nonnumeric edits without losing the current value', () => {
    expect(u5p6.evaluate({})).toEqual({ answer: false });
    const state = transition(u5p6, emptyAttempt(), { type: 'edit', field: 'answer', value: '485', now: 1 });
    for (const value of ['485pm', 'abc', '123456789', '0x1e5']) {
      expect(transition(u5p6, state, { type: 'edit', field: 'answer', value, now: 2 })).toBe(state);
    }
  });

  it('marks blank as wrong, retains the deadline on repeat clicks, and enables edits exactly at expiry', () => {
    const wrong = transition(u5p6, emptyAttempt(), { type: 'submit', now: 100 });
    expect(wrong.retryAt).toBe(20_100);
    expect(wrong.feedback).toEqual({ answer: false });
    expect(score([u5p6], { U5P6: wrong })).toBe(0);
    expect(transition(u5p6, wrong, { type: 'submit', now: 5_100 })).toBe(wrong);
    expect(transition(u5p6, wrong, { type: 'edit', field: 'answer', value: '485', now: 20_099 })).toBe(wrong);
    const ready = transition(u5p6, wrong, { type: 'edit', field: 'answer', value: '485', now: 20_100 });
    expect(ready.answers.answer).toBe('485');
    const solved = transition(u5p6, ready, { type: 'submit', now: 20_100 });
    expect(solved.solvedAt).toBe(20_100);
    expect(solved.retryAt).toBe(0);
    expect(score([u5p6], { U5P6: solved })).toBe(2);
    expect(transition(u5p6, solved, { type: 'submit', now: 30_000 })).toBe(solved);
    expect(transition(u5p6, solved, { type: 'edit', field: 'answer', value: '484', now: 30_000 })).toBe(solved);
    expect(score([u5p6], { U5P6: solved })).toBe(2);
  });

  it('matches the rounded opposite-hydrogen geometry', () => {
    expect(Math.round(Math.sqrt(3) * 154 + 2 * 109)).toBe(485);
  });
});
