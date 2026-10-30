import type { QuestionDefinition } from '../attempts';
import { groupingReducer } from '../l5p9/grouping';

export const l6p1Items = ["Ta","S","As","Cu","V","Zr","F","Th","Na"] as const;

/** Exact set key and retry duration transcribed from the original Power App. */
export const l6p1: QuestionDefinition = {
  id: 'L6P1', year: 'L6', number: 1, title: 'Singles Night', points: 1, cooldownMs: 20_000,
  lockCorrectParts: false, allowIncompleteSubmission: false,
  parts: [{ id: 'groups', label: 'Three groups of three', fields: [] }],
  reduce: groupingReducer(l6p1Items),
};
