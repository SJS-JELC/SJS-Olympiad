import { describe, expect, it } from 'vitest';
import { emptyAttempt, score, type Attempt } from '../../src/questions/attempts';
import { l6p3 } from '../../src/questions/l6p3/definition';
import { transition, normalizeName, selectRun, timedState, privateRun, oxyanions } from '../fixtures/custom-server';
import { barImage, timerColour } from '../../src/questions/l6p3/L6Problem3';
const start = (now = 1_000) => transition(l6p3, emptyAttempt(), { type: 'start', now, random: [0, 0, 0, 0, 0] });
const enter = (state: Attempt, value: string, now: number) => transition(l6p3, state, { type: 'edit', field: 'answer', value, now });
const submit = (state: Attempt, now: number) => transition(l6p3, state, { type: 'submit', now });
const solvePrompt = (state: Attempt, now: number) => submit(enter(state, privateRun(state)[timedState(state)!.step].name, now), now);
describe('L6P3 timed oxyanion challenge', () => {
  it('selects four distinct rows 16–60 and a final row 2–15', () => {
    for (let iteration=0;iteration<100;iteration++) {
      const run = selectRun();
      expect(run).toHaveLength(5);
      expect(new Set(run.slice(0,4).map((p:{row:number})=>p.row)).size).toBe(4);
      expect(run.slice(0,4).every((p:{row:number})=>p.row>=16&&p.row<=60)).toBe(true);
      expect(run[4].row).toBeGreaterThanOrEqual(2);expect(run[4].row).toBeLessThanOrEqual(15);
    }
    expect(oxyanions).toHaveLength(62);
  });
  it('checks only on submit and normalizes source names without dropping oxidation state', () => {
    let state = start();
    state = enter(state, privateRun(state)[0].name.toUpperCase().split('').join(' '), 1_010);
    expect(timedState(state)!.step).toBe(0);
    expect(normalizeName(state.answers.answer)).toBe(normalizeName(privateRun(state)[0].name));
    state = submit(state, 1_020);
    expect(timedState(state)!.step).toBe(1); expect(state.answers).toEqual({});
    expect(state.feedback).toEqual({}); expect(timedState(state)!.revealed).toBe(null);
    const wrong = submit(enter(state, 'nitrate', 1_030), 1_030);
    expect(timedState(wrong)!.step).toBe(1); expect(timedState(wrong)!.revealed).toBe(null);
  });
  it('flashes wrong answers for exactly 500ms and permits immediate correction', () => {
    const state = submit(start(), 2_000);
    expect(timedState(state)!.wrongUntil).toBe(2_500); expect(state.retryAt).toBe(0);
    expect(transition(l6p3, state, { type: 'tick', now: 2_499 })).toBe(state);
    expect(timedState(transition(l6p3, state, { type: 'tick', now: 2_500 }))!.wrongUntil).toBe(0);
    const fixed = solvePrompt(state, 2_100);
    expect(timedState(fixed)!.step).toBe(1); expect(timedState(fixed)!.wrongUntil).toBe(0);
  });
  it('expires at 75 seconds, reveals only the current name, and enforces 20 second GO cooldown', () => {
    const state = solvePrompt(start(), 2_000);
    const timedOut = transition(l6p3, state, { type: 'tick', now: 76_000 });
    expect(timedState(timedOut)!.active).toBe(false);
    expect(timedState(timedOut)!.revealed).toBe(privateRun(state)[1].name); expect(timedOut.answers).toEqual({});
    expect(timedOut.retryAt).toBe(96_000); expect(score([l6p3], { L6P3: timedOut })).toBe(0);
    expect(transition(l6p3, timedOut, { type: 'start', now: 95_999 })).toBe(timedOut);
    const restarted = transition(l6p3, timedOut, { type: 'start', now: 96_000, random: [0, 0, 0, 0, 0] });
    expect(timedState(restarted)!.deadline).toBe(171_000); expect(timedState(restarted)!.revealed).toBe(null);
  });
  it('uses the original deadline after navigation or lock with no delayed score or fresh cooldown', () => {
    const state = start();
    const afterAbsence = submit(enter(state, 'nitrite(III)', 75_999), 80_000);
    expect(afterAbsence.retryAt).toBe(96_000); expect(timedState(afterAbsence)!.revealed).toBe(privateRun(state)[0].name);
    expect(afterAbsence.solvedAt).toBe(null);
    const muchLater = transition(l6p3, state, { type: 'tick', now: 100_000 });
    expect(muchLater.retryAt).toBe(96_000);
    expect(timedState(transition(l6p3, muchLater, { type: 'start', now: 100_000 }))!.active).toBe(true);
  });
  it('awards one point exactly once after the fifth correct submission', () => {
    let state = start(0);
    for (let i = 1; i <= 4; i++) {
      state = solvePrompt(state, i);
      expect(score([l6p3], { L6P3: state })).toBe(0);
      const repeated = submit(state, i);
      expect(timedState(repeated)!.step).toBe(i); expect(repeated.solvedAt).toBe(null);
    }
    state = solvePrompt(state, 5);
    expect(state.solvedAt).toBe(5); expect(timedState(state)!.step).toBe(5);
    expect(score([l6p3], { L6P3: state })).toBe(1);
    for (const action of [{ type: 'submit', now: 6 }, { type: 'start', now: 100_000 }, { type: 'tick', now: 100_000 }] as const)
      expect(transition(l6p3, state, action)).toBe(state);
  });
  it('rejects success at the deadline and ignores starts during an active run', () => {
    const state = start();
    expect(transition(l6p3, state, { type: 'start', now: 2_000 })).toBe(state);
    expect(enter(state, 'x', 2_000).solvedAt).toBe(null);
    expect(transition(l6p3, state, { type: 'edit', field: 'unknown', value: 'x', now: 2_000 })).toBe(state);
    const deadlineSubmit = solvePrompt(state, 76_000);
    expect(timedState(deadlineSubmit)!.active).toBe(false); expect(deadlineSubmit.solvedAt).toBe(null);
  });
  it('matches increasing single-image bars and 60/70-second colour boundaries', () => {
    expect(timerColour(59_999)).toBe('#ffff00'); expect(timerColour(60_000)).toBe('#ffa500');
    expect(timerColour(69_999)).toBe('#ffa500'); expect(timerColour(70_000)).toBe('#ff3131');
    const svg = decodeURIComponent(barImage(.4, '#39ff14').split(',')[1]);
    expect(svg.match(/<svg/g)).toHaveLength(1); expect(svg).toContain('width="184"'); expect(svg.match(/rx="7"/g)).toHaveLength(2);
  });
});
