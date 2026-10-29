import { standardTransition, type Attempt, type AttemptAction, type QuestionDefinition } from '../attempts';
import { integrate, isCorrectComposition, RUN_MS, TIME_MAX, validComposition } from './model';
import type { GcInteraction } from './types';

const accords = ['citrus', 'floral', 'woody'] as const;
const samples = [...accords, 'mystery'] as const;
export function gcState(attempt: Attempt): GcInteraction {
  return attempt.interaction?.kind === 'gc' ? attempt.interaction : {
    kind: 'gc', entered: false, activeRun: null, nextRunId: 1,
    analyses: [], reference: 'citrus', interval: [0.5, 0.7], measurements: [],
  };
}
function validAnswer(value: string): boolean {
  try { return validComposition(JSON.parse(value)); } catch { return false; }
}
/** Root-owned absolute deadlines complete runs once even while route content is unmounted. */
export function reduceGc(initial: Attempt, action: AttemptAction): Attempt {
  let state = initial;
  let lab = gcState(state);
  if (lab.activeRun && action.now >= lab.activeRun.deadline) {
    const sample = lab.activeRun.sample;
    lab = { ...lab, activeRun: null, results: [...(lab.results ?? []), {id: lab.activeRun.id, sample, concentration: lab.activeRun.concentration ?? 100, interval: [0, 0] as const}].slice(-8), loaded: null, analyses: lab.analyses.includes(sample) ? lab.analyses : [...lab.analyses, sample] };
    state = { ...state, interaction: lab };
  }
  const save = (next: GcInteraction): Attempt => ({ ...state, interaction: next });
  switch (action.type) {
    case 'gc-delete-result': return save({...lab, results: lab.results?.filter(row => row.id !== action.id)});
    case 'gc-result-position': {
      if (!lab.results?.some(row => row.id === action.id) || (action.position && !action.position.every(Number.isFinite))) return state;
      const layer = Math.max(0, ...lab.results.map(row => row.layer ?? row.id)) + 1;
      return save({...lab, results: lab.results.map(row => row.id === action.id ? {...row, layer,
        position: action.position ? [Math.max(0, Math.min(1, action.position[0])), Math.max(0, Math.min(1, action.position[1]))] : row.position} : row)});
    }
    case 'gc-dilute': return Number.isFinite(action.value) ? save({...lab, concentrations: {...(lab.concentrations ?? {citrus:100, floral:100, woody:100}), [action.sample]: Math.max(0, Math.min(100, Math.round(action.value * 2) / 2))}}) : state;
    case 'gc-load': return lab.activeRun ? state : save({...lab, loaded: {sample: action.sample, concentration: action.sample === 'mystery' ? 100 : lab.concentrations?.[action.sample] ?? 100}});
    case 'gc-result-interval': return action.interval.every(Number.isFinite) ? save({...lab, results: lab.results?.map(row => row.id === action.id ? {...row, interval: action.interval} : row)}) : state;
    case 'gc-enter': return save({ ...lab, entered: true });
    case 'gc-run':
      if (!lab.entered || lab.activeRun || !samples.includes(action.sample)) return state;
      return save({ ...lab, activeRun: { id: lab.nextRunId, sample: lab.loaded?.sample ?? action.sample, concentration: lab.loaded?.concentration ?? 100, startedAt: action.now, deadline: action.now + RUN_MS }, nextRunId: lab.nextRunId + 1 });
    case 'gc-reference': return accords.includes(action.accord) ? save({ ...lab, reference: action.accord }) : state;
    case 'gc-interval':
      if (action.interval.length !== 2 || !action.interval.every(Number.isFinite)) return state;
      return save({ ...lab, interval: [Math.max(0, Math.min(TIME_MAX, Math.min(...action.interval))), Math.max(0, Math.min(TIME_MAX, Math.max(...action.interval)))] });
    case 'gc-record': {
      if (!lab.analyses.includes('mystery') || !lab.analyses.includes(lab.reference)) return state;
      const measurement = { accord: lab.reference, interval: lab.interval, referenceArea: integrate(lab.reference, lab.interval), mysteryArea: integrate('mystery', lab.interval) };
      return save({ ...lab, measurements: [...lab.measurements.filter(item => item.accord !== lab.reference), measurement] });
    }
    case 'gc-remove': return save({ ...lab, measurements: lab.measurements.filter(item => item.accord !== action.accord) });
    case 'tick': return state;
    default: return standardTransition(u5p5, state, action);
  }
}
export const u5p5: QuestionDefinition = {
  id: 'U5P5', year: 'U5', number: 5, title: 'Scents and Scentsibility', points: 2, cooldownMs: 20_000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'formulation', label: 'Perfume formulation', fields: [{ id: 'composition', label: 'Composition in half-percentage-point units', acceptsEdit: validAnswer }] }],
  reduce: reduceGc,
  evaluate: answers => {
    try { return { formulation: isCorrectComposition(JSON.parse(answers.composition ?? '[50,50,50,50]')) }; }
    catch { return { formulation: false }; }
  },
};
