import { standardTransition, type Attempt, type AttemptAction, type QuestionDefinition } from '../attempts';
import { validComposition } from './model';
import type { GcInteraction } from './types';
import type { GcPresentation } from './presentation';

export function gcState(attempt: Attempt, content?: GcPresentation): GcInteraction {
  if (attempt.interaction?.kind === 'gc') return attempt.interaction;
  if (!content) throw new Error('Question content is unavailable.');
  return {
    kind: 'gc', entered: false, activeRun: null, nextRunId: 1,
    analyses: [], reference: content.dilutableSamples[0], interval: content.initialInterval, measurements: [],
  };
}
function validAnswer(value: string, content: GcPresentation): boolean {
  try { return validComposition(JSON.parse(value), content.initialComposition); } catch { return false; }
}
/** Root-owned absolute deadlines complete runs once even while route content is unmounted. */
export function reduceGc(initial: Attempt, action: AttemptAction, content: GcPresentation): Attempt {
  let state = initial;
  let lab = gcState(state,content);
  const save = (next: GcInteraction): Attempt => ({ ...state, interaction: next });
  switch (action.type) {
    case 'gc-delete-result': return save({...lab, results: lab.results?.filter(row => row.id !== action.id)});
    case 'gc-result-position': {
      if (!lab.results?.some(row => row.id === action.id) || (action.position && !action.position.every(Number.isFinite))) return state;
      const layer = Math.max(0, ...lab.results.map(row => row.layer ?? row.id)) + 1;
      return save({...lab, results: lab.results.map(row => row.id === action.id ? {...row, layer,
        position: action.position ? [Math.max(0, Math.min(1, action.position[0])), Math.max(0, Math.min(1, action.position[1]))] : row.position} : row)});
    }
    case 'gc-dilute': return content.dilutableSamples.includes(action.sample) && Number.isFinite(action.value) ? save({...lab, concentrations: {...(lab.concentrations ?? Object.fromEntries(content.dilutableSamples.map(sample=>[sample,content.dilution.default]))), [action.sample]: Math.max(content.dilution.min, Math.min(content.dilution.max, Math.round(action.value / content.dilution.step) * content.dilution.step))}}) : state;
    case 'gc-load': return lab.activeRun || !content.samples.includes(action.sample) ? state : save({...lab, loaded: {sample: action.sample, concentration: content.dilutableSamples.includes(action.sample) ? action.concentration ?? lab.concentrations?.[action.sample] ?? content.dilution.default : content.dilution.default}});
    case 'gc-result-interval': return action.interval.every(Number.isFinite) ? save({...lab, results: lab.results?.map(row => row.id === action.id ? {...row, interval: action.interval} : row)}) : state;
    case 'gc-enter': return save({ ...lab, entered: true });
    case 'gc-reference': return content.dilutableSamples.includes(action.accord) ? save({ ...lab, reference: action.accord }) : state;
    case 'gc-interval':
      if (action.interval.length !== 2 || !action.interval.every(Number.isFinite)) return state;
      return save({ ...lab, interval: [Math.max(0, Math.min(...action.interval)), Math.max(0, Math.max(...action.interval))] });
    case 'gc-remove': return save({ ...lab, measurements: lab.measurements.filter(item => item.accord !== action.accord) });
    case 'tick': return state;
    default: return standardTransition(configureGc(u5p5,content), state, action);
  }
}
function configureGc(definition:QuestionDefinition,payload:unknown):QuestionDefinition {
  const content=payload as GcPresentation;
  return {...definition,parts:definition.parts.map(part=>({...part,fields:part.fields.map(field=>({...field,acceptsEdit:(value:string)=>validAnswer(value,content)}))})),reduce:(state,action)=>reduceGc(state,action,content)};
}
export const u5p5: QuestionDefinition = {
  id: 'U5P5', year: 'U5', number: 5, title: 'Question 5', protectedContent:true, points: 2, cooldownMs: 20_000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Response', fields: [{ id: 'composition', label: 'Response' }] }],
  configure: configureGc,
};
