import type { QuestionDefinition } from '../attempts';


export const l6p8: QuestionDefinition = {
  id: 'L6P8', number: 8, title: "Looks Pretty Simple", year: 'L6',
  points: 3, cooldownMs: 15000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: "Equilibrium concentration of B", fields: [{
    id: 'answer', label: "Equilibrium concentration of B", acceptsEdit: value => value.length <= 6 && /^[+-]?[\d.eE+-]*$/.test(value),
  }] }],
  // This question is marked exclusively by /api/olympiad/submit.
  evaluate: () => ({ answer: false }),
};
