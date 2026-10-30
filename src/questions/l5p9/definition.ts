import type { QuestionDefinition } from '../attempts';
import { groupingReducer } from '../l5p9/grouping';

export const l5p9Items = ["ZnO2","TiO2","Fe3O4","MgO2","Al2O3","V6O13","Na2O2","MgO","Ti4O7"] as const;

/** Exact set key and retry duration transcribed from the original Power App. */
export const l5p9: QuestionDefinition = {
  id: 'L5P9', year: 'L5', number: 9, title: 'Thinking Oxide the Box', points: 3, cooldownMs: 30_000,
  lockCorrectParts: false, allowIncompleteSubmission: false,
  parts: [{ id: 'groups', label: 'Three groups of three', fields: [] }],
  reduce: groupingReducer(l5p9Items),
};
