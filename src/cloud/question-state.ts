import type { Attempt } from '../questions/attempts';
import type { QuestionState } from './api';

export type Completion = { solvedAt: number; animate: boolean };
type Working = { attempt: Attempt; completion?: Completion };
type Outcome = Pick<QuestionState, 'attempt' | 'serverNow' | 'gcCompletedRunId'>;

export function restoredAttempt(attempt: Attempt): Attempt {
    const result = {...attempt,answers:{}};
    if(attempt.interaction?.kind==='grouping')result.interaction={kind:'grouping',selected:[]};
    if(attempt.interaction?.kind==='gc'){
        const activeRun=attempt.solvedAt===null?attempt.interaction.activeRun:null;
        result.interaction={kind:'gc',entered:!!activeRun,activeRun,nextRunId:attempt.interaction.nextRunId,
            analyses:[],reference:attempt.interaction.reference,interval:attempt.interaction.interval,measurements:[],results:[]};
    }
    return result;
}

/** Reconcile a server outcome with this page's working, or restore a fresh page.
 * Server outcomes own correctness and timing; local drawings, undo and reports
 * never come back from saved answer content. Callers supply one clock sample.
 */
export function reconcileQuestion(previous: Working | undefined, value: Outcome, now: number, pendingAction?: unknown): Working {
    const initial = !previous, delta = now - value.serverNow;
    const solvedAt = value.attempt.solvedAt;
    const completion = typeof solvedAt === 'number' && Number.isFinite(solvedAt) && solvedAt >= 0
        ? { solvedAt, animate: !initial && !previous.completion } : undefined;
    let attempt: Attempt = { ...(initial ? restoredAttempt(value.attempt) : value.attempt),
        retryAt: value.attempt.retryAt ? value.attempt.retryAt + delta : 0 };
    if (attempt.interaction?.kind === 'timed')
        attempt.interaction = { ...attempt.interaction, deadline: attempt.interaction.deadline + delta,
            wrongUntil: attempt.interaction.wrongUntil ? attempt.interaction.wrongUntil + delta : 0 };
    if (attempt.interaction?.kind === 'gc' && attempt.interaction.activeRun)
        attempt.interaction = { ...attempt.interaction, activeRun: { ...attempt.interaction.activeRun,
            startedAt: attempt.interaction.activeRun.startedAt + delta, deadline: attempt.interaction.activeRun.deadline + delta } };
    attempt = { ...attempt, answers: previous?.attempt.answers ?? {} };
    if (previous?.attempt.interaction?.kind === 'grouping')
        attempt = { ...attempt, interaction: previous.attempt.interaction };
    if (attempt.interaction?.kind === 'timed' && previous?.attempt.interaction?.kind === 'timed' &&
        (attempt.interaction.step !== previous.attempt.interaction.step || !attempt.interaction.active))
        attempt = { ...attempt, answers: {} };
    if (attempt.interaction?.kind === 'gc') {
        const canonical = attempt.interaction;
        const local = previous?.attempt.interaction?.kind === 'gc' ? previous.attempt.interaction : undefined;
        const run = canonical.activeRun;
        const input = pendingAction as {type?:string;sample?:string;concentration?:number} | undefined;
        const capture = local?.activeRun?.id === run?.id ? local?.activeRun : input?.type === 'gc-run' ? input : local?.loaded;
        const activeRun = run && { ...capture, ...run,
            sample: run.sample ?? capture?.sample, concentration: run.concentration ?? capture?.concentration };
        // Elapsed client time alone never creates a report.
        const finished = local?.activeRun && value.gcCompletedRunId === local.activeRun.id ? local.activeRun : null;
        const reports = [...(local?.results ?? [])];
        if (finished && !reports.some(row => row.id === finished.id))
            reports.push({id:finished.id,sample:finished.sample,concentration:finished.concentration ?? 100,interval:[0,0]});
        attempt = { ...attempt, interaction: { ...canonical,
            ...(local ? {concentrations:local.concentrations,loaded:finished ? null : local.loaded,
                reference:local.reference,interval:local.interval,measurements:local.measurements} : {}),
            entered: !!activeRun || !!local?.entered, activeRun: activeRun as typeof canonical.activeRun,
            results: reports.slice(-8),
        } };
    }
    return { attempt, completion };
}
