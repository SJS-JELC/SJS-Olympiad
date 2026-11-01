// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyAttempt, type Attempt, type QuestionDefinition } from '../../src/questions/attempts';
import { type QuestionHydration, type SessionState } from '../../src/cloud/api';
import { gcState, u5p5 } from '../../src/questions/u5p5/definition';
import { useServerQuestions, type ServerQuestions } from '../../src/cloud/CloudQuestion';
import { usePractical } from '../../src/practicals/usePractical';

const security = vi.hoisted(() => ({ server: undefined as SessionState | undefined, generation: 0, canAccessTheory: vi.fn(() => true), recordQuestion: vi.fn(), handleMutationError: vi.fn(), captureAuthority: vi.fn<() => (() => boolean)>(() => () => true) }));
vi.mock('../../src/security', () => ({ useCompetitionSecurity: () => security }));
const ordinary: QuestionDefinition = { id: 'L6P8', year: 'L6', number: 8, title: 'Test', points: 3, cooldownMs: 15000, parts: [{ id: 'answer', label: 'Answer', fields: [{ id: 'answer', label: 'Answer' }] }] };
let root: Root, host: HTMLDivElement, questions: ServerQuestions;
function hydration(eventId = 'event', entries: Record<string, Attempt> = { L6P8: emptyAttempt(), L6P6: emptyAttempt() }): QuestionHydration {
  return { eventId, year: 'L6', serverNow: Date.now(), eventEndsAt: Date.now() + 1000000, score: 0, questions: Object.fromEntries(Object.entries(entries).map(([id, attempt]) => [id, { attempt, revision: 0 }])) };
}
function Harness({ eventId }: { eventId: string }) { questions = useServerQuestions(eventId); return null; }
async function mount(eventId = 'event') { await act(async () => root.render(createElement(Harness, { eventId }))); }
async function run(fn: () => unknown) { await act(async () => { await fn(); }); }
const response = (attempt: Attempt, revision = 1, score = 0) => ({ attempt, revision, score, serverNow: Date.now(), eventEndsAt: Date.now() + 1000000 });
const reply = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-30T12:00:00Z'));
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  security.server = { role: 'competitor', expiresAt: Date.now() + 1000000, hydration: hydration() } as SessionState;
  security.canAccessTheory.mockReturnValue(true); security.recordQuestion.mockClear(); security.handleMutationError.mockClear();
  security.generation = 0;
  security.captureAuthority.mockImplementation(() => { const generation = security.generation; return () => security.generation === generation; });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await run(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('theory network policy', () => {
  it('uses GO bulk state for opening, editing, navigation and 15 seconds of local time with zero requests', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); await mount();
    await run(() => questions.load('L6P8')); await run(() => questions.load('L6P6'));
    await run(() => questions.action(ordinary, { type: 'edit', field: 'answer', value: '0.437', now: Date.now() }));
    await run(() => questions.flush()); await run(() => vi.advanceTimersByTimeAsync(16000));
    expect(questions.get('L6P8').attempt.answers.answer).toBe('0.437'); expect(fetcher).not.toHaveBeenCalled();
  });
  it('CHECK makes one direct submit and uncertain retries keep the frozen request ID and answers', async () => {
    const bodies: unknown[] = [];
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => { bodies.push(JSON.parse(options.body as string)); if (bodies.length === 1) throw new Error('Response lost'); return reply(response({ ...emptyAttempt(), answers: { answer: '0.437' }, solvedAt: Date.now() }, 1, 3)); });
    vi.stubGlobal('fetch', fetcher); await mount();
    await run(() => questions.action(ordinary, { type: 'edit', field: 'answer', value: '0.437', now: Date.now() }));
    await run(() => questions.action(ordinary, { type: 'submit', now: Date.now() }));
    expect(fetcher).toHaveBeenCalledTimes(1); expect(String(fetcher.mock.calls[0][0])).toMatch(/\/submit$/); expect(questions.get('L6P8').completion).toBeUndefined(); expect(security.recordQuestion).not.toHaveBeenCalled();
    expect(await questions.flush()).toBe(true); // navigation does not retry or block
    await run(() => questions.action(ordinary, { type: 'edit', field: 'answer', value: 'different', now: Date.now() }));
    await run(() => questions.action(ordinary, { type: 'submit', now: Date.now() })); expect(fetcher).toHaveBeenCalledTimes(1);
    await run(() => questions.flush('L6P8'));
    expect(fetcher).toHaveBeenCalledTimes(2); expect(bodies[1]).toEqual(bodies[0]); expect(questions.get('L6P8').completion?.solvedAt).toBe(Date.now());
  });
  it('hydrates each teacher context once, retains unfinished edits on return and clears all contexts on auth change', async () => {
    security.server = { ...security.server!, role: 'teacher', hydration: undefined };
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => reply(hydration(JSON.parse(options.body as string).eventId)));
    vi.stubGlobal('fetch', fetcher); await mount('catalogue-L6'); await run(() => questions.load('L6P8'));
    await run(() => questions.action(ordinary, { type: 'edit', field: 'answer', value: 'unfinished', now: Date.now() }));
    await mount('catalogue-U6'); await run(() => questions.load('L6P8')); await mount('catalogue-L6'); await run(() => questions.load('L6P8'));
    expect(fetcher).toHaveBeenCalledTimes(2); expect(questions.get('L6P8').attempt.answers.answer).toBe('unfinished');
    security.server = { ...security.server!, expiresAt: security.server!.expiresAt + 1 }; await mount('catalogue-L6'); await run(() => questions.load('L6P8'));
    expect(fetcher).toHaveBeenCalledTimes(3); expect(questions.get('L6P8').attempt.answers.answer).toBeUndefined();
  });
  it('loses unfinished edits on router reload while restoring confirmed completion from hydration', async () => {
    vi.stubGlobal('fetch', vi.fn()); await mount(); await run(() => questions.action(ordinary, { type: 'edit', field: 'answer', value: 'unfinished', now: Date.now() }));
    await run(() => root.unmount()); root = createRoot(host); await mount(); expect(questions.get('L6P8').attempt.answers.answer).toBeUndefined();
    await run(() => root.unmount()); root = createRoot(host);
    security.server = { ...security.server!, hydration: hydration('event', { L6P8: { ...emptyAttempt(), answers: { answer: '0.437' }, solvedAt: Date.now() - 1000 } }) };
    await mount(); expect(questions.get('L6P8').completion).toEqual({ solvedAt: Date.now() - 1000, animate: false });
  });
  it('ignores a delayed authorization failure from an old authentication identity', async () => {
    let respond!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { respond = resolve; })));
    await mount(); await run(() => questions.action(ordinary, { type: 'submit', now: Date.now() }));
    security.server = { ...security.server!, expiresAt: security.server!.expiresAt + 1 };
    await mount();
    await run(() => respond(new Response(JSON.stringify({ error: 'Old session expired' }), { status: 401 })));
    expect(security.handleMutationError).not.toHaveBeenCalled();
    expect(questions.get('L6P8').pending).toBeUndefined();
    expect(questions.get('L6P8').status).toBe('Saved');
  });
  it('does not relock a recovered authority generation after a delayed old 423, retaining the frozen retry', async () => {
    let respond!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { respond = resolve; })));
    await mount(); await run(() => questions.action(ordinary, { type: 'submit', now: Date.now() }));
    const pending = questions.get('L6P8').pending;
    security.generation++;
    await run(() => respond(new Response(JSON.stringify({ error: 'Old breach response' }), { status: 423 })));
    expect(security.handleMutationError).not.toHaveBeenCalled();
    expect(questions.get('L6P8').pending).toBe(pending);
    expect(questions.get('L6P8').status).toContain('Not saved');
  });
  it('keeps GC setup and report edits local, sends captured load once, then reconciles its deadline once', async () => {
    const lab = { ...gcState(emptyAttempt()), entered: false };
    security.server = { ...security.server!, hydration: hydration('event', { U5P5: { ...emptyAttempt(), interaction: lab } }) };
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
      const { action } = JSON.parse(options.body as string);
      if (!action) return reply(response({ ...emptyAttempt(), solvedAt: Date.now(), interaction: { ...lab, entered: true, results: [{ id: 1, sample: 'citrus', concentration: 20, interval: [0, 1] }] } }));
      return reply(response({ ...emptyAttempt(), interaction: { ...lab, entered: true, nextRunId: 2, activeRun: action.type === 'gc-run' ? { id: 1, sample: action.sample, concentration: action.concentration, startedAt: Date.now(), deadline: Date.now() + 6000 } : null, results: action.type === 'tick' ? [{ id: 1, sample: 'citrus', concentration: 20, interval: [0, 1] }] : [] } }));
    });
    vi.stubGlobal('fetch', fetcher); await mount();
    await run(() => questions.action(u5p5, { type: 'gc-enter', now: Date.now() }));
    await run(() => questions.action(u5p5, { type: 'gc-load', sample: 'citrus', concentration: 20, now: Date.now() }));
    await run(() => questions.action(u5p5, { type: 'gc-dilute', sample: 'citrus', value: 30, now: Date.now() })); expect(fetcher).not.toHaveBeenCalled();
    await run(() => questions.action(u5p5, { type: 'gc-run', sample: 'citrus', now: Date.now() }));
    expect(JSON.parse(fetcher.mock.calls[0][1].body as string).action).toEqual({ type: 'gc-run', sample: 'citrus', concentration: 20 });
    expect(gcState(questions.get('U5P5').attempt).concentrations?.citrus).toBe(30);
    await run(() => vi.advanceTimersByTimeAsync(6250)); expect(fetcher).toHaveBeenCalledTimes(2); expect(gcState(questions.get('U5P5').attempt).results).toHaveLength(1);
    await run(() => questions.action(u5p5, { type: 'gc-delete-result', id: 1, now: Date.now() })); expect(fetcher).toHaveBeenCalledTimes(2);
    await run(() => questions.action(u5p5, { type: 'submit', now: Date.now() }));
    expect(questions.get('U5P5').completion).toBeDefined(); expect(gcState(questions.get('U5P5').attempt).results).toHaveLength(0);
  });
  it('clears a timed wrong flash locally without a request, and reconciles the actual deadline once', async () => {
    security.server = { ...security.server!, hydration: hydration('event', { L6P3: { ...emptyAttempt(), interaction: { kind: 'timed', formula: 'SO4', step: 0, deadline: Date.now() + 75000, active: true, wrongUntil: Date.now() + 500, revealed: null } } }) };
    const fetcher = vi.fn(async () => reply(response({ ...emptyAttempt(), interaction: { kind: 'timed', formula: 'SO4', step: 0, deadline: Date.now(), active: false, wrongUntil: 0, revealed: 'sulfate' } })));
    vi.stubGlobal('fetch', fetcher); await mount(); await run(() => vi.advanceTimersByTimeAsync(1000)); expect(fetcher).not.toHaveBeenCalled();
    await run(() => vi.advanceTimersByTimeAsync(75000)); expect(fetcher).toHaveBeenCalledTimes(1);
    await run(() => vi.advanceTimersByTimeAsync(1000)); expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('practical network policy', () => {
  it('retains one read and one 500ms autosave with local access checks and no preflight', async () => {
    let practical: ReturnType<typeof usePractical>;
    const canAccess = vi.fn(() => true), canEdit = vi.fn(() => true), failure = vi.fn();
    const view = { year: 'L6', revision: 0, responses: {}, finalField: 'numPracticalResponse4', updatedAt: null, serverNow: Date.now(), eventEndsAt: Date.now() + 1000000, readOnly: false };
    const fetcher = vi.fn(async (url: string) => reply({ ...view, revision: url.endsWith('practical-save') ? 1 : 0 })); vi.stubGlobal('fetch', fetcher);
    function PracticalHarness() { practical = usePractical('event', canAccess, canEdit, failure); return null; }
    await run(() => root.render(createElement(PracticalHarness))); expect(fetcher).toHaveBeenCalledTimes(1);
    await run(() => practical.edit('numPracticalResponse3', '0.2500')); await run(() => vi.advanceTimersByTimeAsync(499)); expect(fetcher).toHaveBeenCalledTimes(1);
    await run(() => vi.advanceTimersByTimeAsync(1)); expect(fetcher).toHaveBeenCalledTimes(2); expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['/api/olympiad/practical', '/api/olympiad/practical-save']);
  });
});
