import type { QuestionDefinition } from '../attempts';
import { groupingReducer } from '../l5p9/grouping';

export const doubleTrouble: QuestionDefinition = {
  id: 'U5P7', year: 'U5', number: 7, title: 'Question 7', protectedContent:true, points: 2, cooldownMs: 20_000,
  lockCorrectParts: false, allowIncompleteSubmission: false,
  parts: [{ id: 'groups', label: 'Response', fields: [] }],
  reduce: groupingReducer(9),
};
