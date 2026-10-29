import type { QuestionDefinition } from '../attempts';

/** Power Apps L5Problem1: preserve its literal-space removal and case-insensitive name key. */
export const l5p1: QuestionDefinition = {
  id: 'L5P1', number: 1, title: "CAN'T TAKE THE HEAT?", year: 'L5',
  points: 1, cooldownMs: 30_000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Name of the metal, M', fields: [{
    id: 'answer', label: 'Name of the metal, M', acceptsEdit: value => value.length <= 40,
  }] }],
  evaluate: answers => ({ answer: (answers.answer ?? '').trim().replaceAll(' ', '').toLowerCase() === 'vanadium' }),
};
