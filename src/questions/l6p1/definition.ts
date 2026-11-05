import type { QuestionDefinition } from '../attempts';
import { groupingReducer } from '../l5p9/grouping';

/** Exact set key and retry duration transcribed from the original Power App. */
export const l6p1: QuestionDefinition = {
  id: 'L6P1', year: 'L6', number: 1, title: 'Question 1', points: 1, cooldownMs: 20_000,
  protectedContent: true,
  lockCorrectParts: false, allowIncompleteSubmission: false,
  parts: [{ id: 'groups', label: 'Response', fields: [] }],
  reduce: groupingReducer(9),
};
