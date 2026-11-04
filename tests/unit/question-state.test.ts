import { describe, expect, it } from 'vitest';
import { reconcileQuestion } from '../../src/cloud/question-state';
import { emptyAttempt, type Attempt } from '../../src/questions/attempts';
import { gcState } from '../../src/questions/u5p5/definition';

describe('server outcome reconciliation', () => {
  it('restores clocks once, strips working, and keeps the original completion time', () => {
    const saved: Attempt = { ...emptyAttempt(), answers: { name: 'old answer' }, retryAt: 1200, solvedAt: 900,
      interaction: { kind: 'timed', formula: 'SO4', step: 1, active: false, deadline: 1100, wrongUntil: 1050, revealed: 'sulfate' } };
    const outcome = { attempt: saved, serverNow: 1000 };
    const first = reconcileQuestion(undefined, outcome, 2000);
    expect(first.attempt.answers).toEqual({});
    expect(first.attempt.retryAt).toBe(2200);
    expect(first.attempt.interaction).toMatchObject({ deadline: 2100, wrongUntil: 2050 });
    expect(first.completion).toEqual({ solvedAt: 900, animate: false });
    expect(reconcileQuestion(first, outcome, 2000).attempt).toEqual(first.attempt);
    expect(saved.retryAt).toBe(1200);
  });

  it('preserves page drawings and grouping while ignoring persisted answer content', () => {
    const local: Attempt = { ...emptyAttempt(), answers: { drawings: 'page drawing and undo' }, interaction: { kind: 'grouping', selected: ['A', 'B'] } };
    const outcome = { attempt: { ...emptyAttempt(), answers: { drawings: 'historical drawing' }, retryAt: 21000 }, serverNow: 1000 };
    const merged = reconcileQuestion({ attempt: local }, outcome, 1000);
    expect(merged.attempt.answers).toBe(local.answers);
    expect(merged.attempt.interaction).toBe(local.interaction);
    expect(merged.attempt.retryAt).toBe(21000);
    expect(reconcileQuestion(undefined, { ...outcome, attempt: local }, 1000).attempt.interaction).toEqual({ kind: 'grouping', selected: [] });
  });

  it('clears typed timed answers only on a changed prompt or timeout', () => {
    const attempt: Attempt = { ...emptyAttempt(), answers: { name: 'typed' }, interaction: { kind: 'timed', formula: 'SO4', step: 0, active: true, deadline: 75000, wrongUntil: 0, revealed: null } };
    const previous = { attempt };
    expect(reconcileQuestion(previous, { attempt, serverNow: 0 }, 0).attempt.answers).toBe(attempt.answers);
    for (const change of [{ step: 1 }, { active: false }]) {
      const next: Attempt = { ...attempt, interaction: { ...attempt.interaction as Extract<Attempt['interaction'], { kind: 'timed' }>, ...change } };
      expect(reconcileQuestion(previous, { attempt: next, serverNow: 0 }, 0).attempt.answers).toEqual({});
    }
  });

  it('requires the matching server completion ID, deduplicates reports, and retains only eight', () => {
    const lab = gcState(emptyAttempt());
    const running: Attempt = { ...emptyAttempt(), interaction: { ...lab,
      activeRun: { id: 9, sample: 'citrus', concentration: 20, startedAt: 0, deadline: 4000 },
      results: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, sample: 'mystery' as const, concentration: 100, interval: [0, 0] as const })) } };
    const outcome = { attempt: { ...emptyAttempt(), interaction: { ...lab, activeRun: null } }, serverNow: 5000 };
    for (const gcCompletedRunId of [undefined, 8]) {
      const unconfirmed = reconcileQuestion({ attempt: running }, { ...outcome, gcCompletedRunId }, 9000);
      expect(gcState(unconfirmed.attempt).results?.map(row => row.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    }
    const confirmed = reconcileQuestion({ attempt: running }, { ...outcome, gcCompletedRunId: 9 }, 9000);
    expect(gcState(confirmed.attempt).results?.map(row => row.id)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(gcState(confirmed.attempt).results?.at(-1)).toMatchObject({ sample: 'citrus', concentration: 20 });
    expect(reconcileQuestion(confirmed, { ...outcome, gcCompletedRunId: 9 }, 9000).attempt).toEqual(confirmed.attempt);
  });

  it('uses a frozen request capture when the server omits public GC capture details', () => {
    const lab = gcState(emptyAttempt());
    const wireRun = { id: 1, startedAt: 100, deadline: 4100 } as NonNullable<typeof lab.activeRun>;
    const next = reconcileQuestion({ attempt: { ...emptyAttempt(), interaction: lab } }, {
      attempt: { ...emptyAttempt(), interaction: { ...lab, activeRun: wireRun } }, serverNow: 100,
    }, 1100, { type: 'gc-run', sample: 'woody', concentration: 35 });
    expect(gcState(next.attempt).activeRun).toMatchObject({ id: 1, startedAt: 1100, deadline: 5100, sample: 'woody', concentration: 35 });
  });
});
