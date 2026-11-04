/** Test-only adapter: existing independent chemistry cases exercise the private server marker. */
import { ordinaryDefinitions } from '../../api/src/private/ordinary.mjs';
import { reduceQuestion } from '../../api/src/questions.mjs';
import { transition as editPresentation, type Attempt, type AttemptAction, type QuestionDefinition as PublicDefinition } from '../../src/questions/attempts';
export { emptyAttempt, score } from '../../src/questions/attempts';
export type { Answers, Attempt } from '../../src/questions/attempts';
export type QuestionDefinition = PublicDefinition & {evaluate:(answers:Readonly<Record<string,string>>)=>Readonly<Record<string,boolean>>};
export const serverDefinition = (definition: PublicDefinition):QuestionDefinition => ({
  ...definition,
  evaluate: (answers: Readonly<Record<string,string>>) => ordinaryDefinitions.get(definition.id)!.evaluate(answers),
});
export function transition(definition: PublicDefinition, state: Attempt, action: AttemptAction): Attempt {
  if(action.type !== 'submit')return editPresentation(definition,state,action);
  const outcome=reduceQuestion(definition.id,{state,privateState:null},{type:'submit',answers:state.answers},action.now)!.state as Attempt;
  // The API deliberately returns no raw working. The mounted page merges that
  // authoritative outcome into its local answers rather than erasing other fields.
  return outcome===state?state:{...outcome,answers:state.answers};
}
