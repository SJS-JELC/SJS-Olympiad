import type { Attempt, AttemptAction, QuestionDefinition, TimedInteraction, TimedPrompt } from '../attempts';
import { oxyanions } from './data';
export const RUN_MS = 75_000;
export const GO_COOLDOWN_MS = 20_000;
export const WRONG_FLASH_MS = 500;
export const normalizeName = (value: string) => value.trim().toLowerCase().replace(/ /g, '');
export const timedState = (attempt: Attempt): TimedInteraction | undefined => attempt.interaction?.kind === 'timed' ? attempt.interaction : undefined;

/** Sample without replacement: four warm-up rows, then one from the final pool.
 * Inject five [0,1) draws for deterministic tests; normal play uses Math.random.
 */
export function selectRun(random?: readonly number[]): readonly TimedPrompt[] {
  let cursor = 0;
  const draw = () => {
    const value = random ? (random[cursor++] ?? 0) : Math.random();
    return Number.isFinite(value) ? Math.max(0, Math.min(1 - Number.EPSILON, value)) : 0;
  };
  const pool = oxyanions.filter(prompt => prompt.row >= 16 && prompt.row <= 60);
  const selected: TimedPrompt[] = [];
  for (let i = 0; i < 4; i++) selected.push(pool.splice(Math.floor(draw() * pool.length), 1)[0]);
  const finalPool = oxyanions.filter(prompt => prompt.row >= 2 && prompt.row <= 15);
  selected.push(finalPool[Math.floor(draw() * finalPool.length)]);
  return selected;
}

/** Absolute deadlines remain authoritative even while the view is unmounted. */
export function reduceTimed(state: Attempt, action: AttemptAction): Attempt {
  if (state.solvedAt !== null) return state;
  const run = timedState(state);
  if (run?.active && action.now >= run.deadline) {
    return { ...state, answers: {}, feedback: {}, retryAt: run.deadline + GO_COOLDOWN_MS,
      interaction: { ...run, active: false, wrongUntil: 0, revealed: run.run[run.step]?.name ?? null } };
  }
  if (action.type === 'start') {
    if (run?.active || action.now < state.retryAt) return state;
    return { ...state, answers: {}, feedback: {}, retryAt: 0,
      interaction: { kind: 'timed', run: selectRun(action.random), step: 0,
        deadline: action.now + RUN_MS, active: true, wrongUntil: 0, revealed: null } };
  }
  if (!run?.active) return state;
  if (action.type === 'tick') {
    return run.wrongUntil > 0 && action.now >= run.wrongUntil
      ? { ...state, interaction: { ...run, wrongUntil: 0 } } : state;
  }
  if (action.type === 'edit') {
    if (action.field !== 'answer') return state;
    return { ...state, answers: { answer: action.value } };
  }
  if (action.type !== 'submit') return state;
  if (normalizeName(state.answers.answer ?? '') !== normalizeName(run.run[run.step].name)) {
    return { ...state, interaction: { ...run, wrongUntil: action.now + WRONG_FLASH_MS } };
  }
  const step = run.step + 1;
  const solved = step === run.run.length;
  return { ...state, answers: {}, feedback: {}, solvedAt: solved ? action.now : null,
    interaction: { ...run, step, active: !solved, wrongUntil: 0, revealed: null } };
}
export const l6p3: QuestionDefinition = {
  id: 'L6P3', number: 3, title: 'Who Ate All the Names?', year: 'L6',
  points: 1, cooldownMs: GO_COOLDOWN_MS, lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Oxyanion name', fields: [{ id: 'answer', label: 'Oxyanion name' }] }],
  reduce: reduceTimed,
  // Five sequential correct submissions are the only successful marking route.
  evaluate: () => ({ answer: false }),
};
