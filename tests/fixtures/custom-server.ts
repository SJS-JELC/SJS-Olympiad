// @ts-expect-error Node-only authorized scientific fixture.
import {u5p5Presentation} from '../../api/src/presentation/records/u5p5.mjs';
import {presentedDefinition} from '../../src/contracts/presentation';
import { reconcileQuestion } from '../../src/cloud/question-state';
import { transition as localTransition, type Attempt, type AttemptAction, type QuestionDefinition, type TimedInteraction } from '../../src/questions/attempts';
// Node-only runtime modules deliberately contain the private source keys.
// @ts-expect-error Node backend module has no browser declaration.
import { reduceCustomQuestion, selectRun, normalizeName, customData } from '../../api/src/custom-questions.mjs';
// @ts-expect-error Node backend module has no browser declaration.
import { oxyanions } from '../../api/src/private-oxyanions.mjs';
// @ts-expect-error Node backend module has no browser declaration.
import { retainedQuestion } from '../../api/src/theory-retention.mjs';
export { selectRun, normalizeName, customData, oxyanions };
const secrets = new WeakMap<Attempt, {run?:(number|{row:number;name:string;formula:string})[]}>();
export const privateRun = (state:Attempt) => (secrets.get(state)?.run ?? []).map(row=>typeof row==='number'?oxyanions.find((item:{row:number})=>item.row===row):row);
export const l5p9Groups = [['ZnO2','MgO2','Na2O2'],['Fe3O4','V6O13','Ti4O7'],['TiO2','Al2O3','MgO']] as const;
export const l6p1Groups = [['S','Zr','Th'],['Cu','Na','F'],['V','As','Ta']] as const;
/** Explicit server fixture: test helpers retain private state outside the public attempt. */
export function transition(definition:QuestionDefinition,state:Attempt,action:AttemptAction):Attempt {
  if(state.solvedAt!==null)return state;
  const remember=(next:Attempt,privateState=secrets.get(state)??{})=>{
    secrets.set(next,privateState);return JSON.stringify(next)===JSON.stringify(state)?state:next;
  };
  if(!['submit','start','tick','gc-run'].includes(action.type))
    return remember(localTransition(definition.id==='U5P5'?presentedDefinition(definition,u5p5Presentation.presentation):definition,state,action));
  let input:Record<string,unknown>={...action};
  if(action.type==='submit')input={...input,answers:state.interaction?.kind==='grouping'?{groups:state.interaction.selected.join(',')}:state.answers};
  if(action.type==='gc-run'){
    const lab=state.interaction;
    if(lab?.kind!=='gc'||!lab.loaded||lab.activeRun)return state;
    input={...input,...lab.loaded};
  }
  const previous=retainedQuestion(definition.id,{state,privateState:secrets.get(state)??{}});
  const result=reduceCustomQuestion(definition.id,previous,input,action.now);
  // This fixture is a server adapter: determine completion from the retained
  // server run, then let the production client reconcile the confirmed ID.
  const run = previous.state.interaction?.kind === 'gc' ? previous.state.interaction.activeRun : null;
  const gcCompletedRunId = run && action.now >= run.deadline ? run.id : undefined;
  const next = reconcileQuestion({attempt:state}, {
    attempt: retainedQuestion(definition.id,result).state as Attempt,
    serverNow: action.now, gcCompletedRunId,
  }, action.now, input).attempt;
  return remember(next,result.privateState);
}
export const timedState = (state:Attempt) => state.interaction as TimedInteraction;
