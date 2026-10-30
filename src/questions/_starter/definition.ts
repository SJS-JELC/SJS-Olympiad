import type { QuestionDefinition } from '../attempts';

/** Copy and replace before registering. This example is deliberately not in the catalogue. */
export const starterDefinition: QuestionDefinition = {
  id: 'EXAMPLE-ONLY', number: 0, title: 'Starter question', year: 'EXAMPLE',
  points: 1, cooldownMs: 20_000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Answer', fields: [{
    id: 'answer', label: 'Answer', acceptsEdit: value => /^\d{0,3}$/.test(value),
  }] }],
};
