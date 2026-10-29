import type { QuestionDefinition } from '../attempts';

/** Marking transcribed from appCodexL6Problem5.txt; angles are degrees, not modulo 360. */
export const l6p5: QuestionDefinition = {
  id: 'L6P5', number: 5, title: 'Twist and Bump', year: 'L6', points: 2, cooldownMs: 20_000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [1, 2, 3].map(number => ({
    id: 'molecule' + number, label: 'Molecule ' + number,
    fields: [
      { id: 'molecule' + number + 'Minimum', label: 'Most stable', acceptsEdit: value => /^\d{0,3}$/.test(value) },
      { id: 'molecule' + number + 'Maximum', label: 'Least stable', acceptsEdit: value => /^\d{0,3}$/.test(value) },
    ],
  })),
  evaluate: answers => Object.fromEntries([[300, 60], [300, 120], [60, 240]].map((pair, index) => [
    'molecule' + (index + 1), pair.every((value, field) => {
      const text = answers['molecule' + (index + 1) + (field === 0 ? 'Minimum' : 'Maximum')];
      return typeof text === 'string' && /^\d{1,3}$/.test(text) && Number(text) === value;
    }),
  ])),
};
