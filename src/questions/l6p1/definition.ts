import type { QuestionDefinition } from '../attempts';
import { groupingReducer, matchesGroups } from '../l5p9/grouping';

export const l6p1Items = ["Ta","S","As","Cu","V","Zr","F","Th","Na"] as const;
export const l6p1Groups = [["S","Zr","Th"],["Cu","Na","F"],["V","As","Ta"]] as const;

/** Exact set key and retry duration transcribed from the original Power App. */
export const l6p1: QuestionDefinition = {
  id: 'L6P1', year: 'L6', number: 1, title: 'Singles Night', points: 1, cooldownMs: 20_000,
  lockCorrectParts: false, allowIncompleteSubmission: false,
  parts: [{ id: 'groups', label: 'Three groups of three', fields: [] }],
  evaluate: answers => ({ groups: matchesGroups((answers.groups ?? '').split(','), l6p1Items, l6p1Groups) }),
  reduce: groupingReducer(l6p1Items, l6p1Groups, 20000),
};
