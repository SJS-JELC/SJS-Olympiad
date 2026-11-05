import type { QuestionDefinition } from '../attempts';
import { groupingReducer } from '../l5p9/grouping';


export const l5p9: QuestionDefinition = {
  id: 'L5P9', year: 'L5', number: 9, title: 'Question 9', protectedContent: true, points: 3, cooldownMs: 30_000,
  lockCorrectParts: false, allowIncompleteSubmission: false,
  parts: [{ id: 'groups', label: 'Groups', fields: [] }],
  reduce: groupingReducer(9),
};
