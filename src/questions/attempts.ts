import type { GcAction, GcInteraction } from './u5p5/types';
/** Local demonstration authority. Replace this boundary with a server in production. */
export type Answers = Readonly<Record<string, string>>;
export type Part = { id: string; label: string; fields: readonly { id: string; label: string; acceptsEdit?: (value: string) => boolean }[] };
export type GroupingInteraction = { kind: 'grouping'; selected: readonly string[] };
export type TimedPrompt = { row: number; formula: string; name: string };
export type TimedInteraction = {
  kind: 'timed'; run: readonly TimedPrompt[]; step: number; deadline: number;
  active: boolean; wrongUntil: number; revealed: string | null;
};
export type InteractionState = GroupingInteraction | TimedInteraction | GcInteraction;
export type InteractionAction =
  | { type: 'select'; item: string; now: number }
  | { type: 'reset'; now: number }
  | { type: 'start'; now: number; random?: readonly number[] }
  | { type: 'tick'; now: number };
export type QuestionDefinition = {
  id: string; number: number; title: string; year: string; points: number; cooldownMs: number;
  /** Presentation only. Omit to use the shared Olympiad eagle. */
  headerArtwork?: { src: string; alt?: string; className?: string };
  lockCorrectParts?: boolean; allowIncompleteSubmission?: boolean;
  parts: readonly Part[];
  /** Pure custom transitions; router retains and reconciles state across all routes. */
  reduce?: (state: Attempt, action: AttemptAction) => Attempt;
  evaluate: (answers: Answers) => Readonly<Record<string, boolean>>;
};
export type Attempt = {
  answers: Answers; feedback: Readonly<Record<string, boolean>>;
  retryAt: number; solvedAt: number | null; interaction?: InteractionState;
};
export const emptyAttempt = (): Attempt => ({ answers: {}, feedback: {}, retryAt: 0, solvedAt: null });
export type AttemptAction = InteractionAction | GcAction | { type: 'edit'; field: string; value: string; now: number } | { type: 'submit'; now: number };
export function transition(definition: QuestionDefinition, state: Attempt, action: AttemptAction): Attempt {
  if (definition.reduce) return definition.reduce(state, action);
  return standardTransition(definition, state, action);
}
/** Shared ordinary edit/marking flow, also usable by custom reducers without recursion. */
export function standardTransition(definition: QuestionDefinition, state: Attempt, action: AttemptAction): Attempt {
  if (action.type !== 'edit' && action.type !== 'submit') return state;
  if (state.solvedAt !== null || action.now < state.retryAt) return state;
  if (action.type === 'edit') {
    const part = definition.parts.find(part => part.fields.some(field => field.id === action.field));
    const field = part?.fields.find(field => field.id === action.field);
    if (!part || !field || (definition.lockCorrectParts !== false && state.feedback[part.id] === true) || (field.acceptsEdit && !field.acceptsEdit(action.value))) return state;
    return { ...state, answers: { ...state.answers, [action.field]: action.value } };
  }
  // Questions can opt into marking incomplete submissions as attempts.
  if (!definition.allowIncompleteSubmission && definition.parts.some(part => part.fields.some(field => !state.answers[field.id]?.trim()))) return state;
  const feedback = definition.evaluate(state.answers);
  const solved = definition.parts.every(part => feedback[part.id] === true);
  return { ...state, feedback, retryAt: solved ? 0 : action.now + definition.cooldownMs, solvedAt: solved ? action.now : null };
}
export function score(definitions: readonly QuestionDefinition[], attempts: Readonly<Record<string, Attempt>>): number {
  return definitions.reduce((total, question) => total + (attempts[question.id]?.solvedAt != null ? question.points : 0), 0);
}
