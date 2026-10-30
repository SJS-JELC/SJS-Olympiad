import { serverDefinition } from './server-markers';
import { describe, expect, it } from 'vitest';
import { emptyAttempt, score, transition, type Answers, type Attempt } from './server-markers';
import { l6p5 as public_l6p5 } from '../../src/questions/l6p5/definition';
const l6p5=serverDefinition(public_l6p5);

const correct: Answers = { molecule1Minimum: '300', molecule1Maximum: '60', molecule2Minimum: '300', molecule2Maximum: '120', molecule3Minimum: '60', molecule3Maximum: '240' };
const submit = (state: Attempt, now = 1000) => transition(l6p5, state, { type: 'submit', now });
describe('L6P5 marking and shared attempt lifecycle', () => {
  it('marks each molecule as a pair, awarding nothing for a partial answer', () => {
    const state = submit({ ...emptyAttempt(), answers: { ...correct, molecule2Maximum: '60' } });
    expect(state.feedback).toEqual({ answer: false });
    expect(state.retryAt).toBe(21000); expect(score([l6p5], { L6P5: state })).toBe(0);
  });
  it('rejects all edits during cooldown, then permits editing any pair', () => {
    const state = submit({ ...emptyAttempt(), answers: { ...correct, molecule2Maximum: '60' } });
    expect(submit(state, 20999)).toBe(state);
    expect(transition(l6p5, state, { type: 'edit', field: 'molecule2Maximum', value: '120', now: 20999 })).toBe(state);
    expect(transition(l6p5, state, { type: 'edit', field: 'molecule1Minimum', value: '60', now: 21000 }).answers.molecule1Minimum).toBe('60');
    const fixed = transition(l6p5, state, { type: 'edit', field: 'molecule2Maximum', value: '120', now: 21000 });
    const solved = submit(fixed, 21000); expect(solved.solvedAt).toBe(21000);
    expect(score([l6p5], { L6P5: solved })).toBe(2); expect(submit(solved, 22000)).toBe(solved);
  });
  it('counts blank input as a wrong attempt and prevents a repeated award at timestamp zero', () => {
    const blank = emptyAttempt(); expect(submit(blank).retryAt).toBe(21000);
    const solved = submit({ ...blank, answers: correct }, 0);
    expect(score([l6p5], { L6P5: solved })).toBe(2); expect(submit(solved)).toBe(solved);
  });
  it.each(['', ' ', '300x', '3e2', '300.0', '-60', '660'])('rejects malformed or non-key angle %j', value => {
    expect(l6p5.evaluate({ ...correct, molecule1Minimum: value }).molecule1).toBe(false);
  });
  it('rejects unknown fields and non-digit edits', () => {
    const state = emptyAttempt();
    for (const [field, value] of [['unknown', '60'], ['molecule1Minimum', 'NaN'], ['molecule1Minimum', '3000']])
      expect(transition(l6p5, state, { type: 'edit', field, value, now: 0 })).toBe(state);
  });
});
