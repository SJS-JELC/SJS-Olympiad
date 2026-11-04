import type { QuestionDefinition } from '../attempts';
import { groupingReducer } from '../l5p9/grouping';

// Mixed display order; grouping answers remain on the server.
export const doubleTroubleItems = ['C4H8', 'C3H4O', 'C10H22O', 'C2H2O', 'C4H11N', 'C2H6', 'C5H10', 'C2H5N', 'C50H98'] as const;
export const doubleTrouble: QuestionDefinition = {
  id: 'U5P7', year: 'U5', number: 7, title: 'Double Trouble', points: 2, cooldownMs: 20_000,
  lockCorrectParts: false, allowIncompleteSubmission: false,
  parts: [{ id: 'groups', label: 'Three groups of three', fields: [] }],
  reduce: groupingReducer(doubleTroubleItems),
};
