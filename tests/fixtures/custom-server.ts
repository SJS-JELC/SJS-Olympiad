import type { Attempt, AttemptAction, QuestionDefinition, TimedInteraction } from '../../src/questions/attempts';
// Node-only runtime modules deliberately contain the private source keys.
// @ts-expect-error Node backend module has no browser declaration.
import { reduceCustomQuestion, selectRun, normalizeName, customData } from '../../api/src/custom-questions.mjs';
// @ts-expect-error Node backend module has no browser declaration.
import { oxyanions } from '../../api/src/private-oxyanions.mjs';
export { selectRun, normalizeName, customData, oxyanions };
const secrets = new WeakMap<Attempt, {run?:{row:number;name:string;formula:string}[]}>();
export const privateRun = (state:Attempt) => secrets.get(state)?.run ?? [];
export const l5p9Groups = [['ZnO2','MgO2','Na2O2'],['Fe3O4','V6O13','Ti4O7'],['TiO2','Al2O3','MgO']] as const;
export const l6p1Groups = [['S','Zr','Th'],['Cu','Na','F'],['V','As','Ta']] as const;
/** Explicit server fixture: test helpers retain private state outside the public attempt. */
export function transition(definition:QuestionDefinition,state:Attempt,action:AttemptAction):Attempt {
  if(action.type==='edit') {
    if(state.solvedAt!==null||action.now<state.retryAt)return state;
    const field=definition.parts.flatMap(part=>part.fields).find(field=>field.id===action.field);
    if(!field||(field.acceptsEdit&&!field.acceptsEdit(action.value)))return state;
    const next={...state,answers:{...state.answers,[action.field]:action.value}};
    secrets.set(next,secrets.get(state)??{});return next;
  }
  let previous={state,privateState:secrets.get(state)??{}};
  // The laboratory UI performs Load then Run; keep that setup explicit in this fixture.
  if(action.type==='gc-run') previous=reduceCustomQuestion(definition.id,previous,{type:'gc-load',sample:action.sample},action.now);
  const result=reduceCustomQuestion(definition.id,previous,{...action,...(action.type==='submit'?{answers:state.answers}:{})},action.now);
  const next=result.state as Attempt;
  secrets.set(next,result.privateState);
  return JSON.stringify(next)===JSON.stringify(state)?state:next;
}
export const timedState = (state:Attempt) => state.interaction as TimedInteraction;
