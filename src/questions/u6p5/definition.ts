import type { QuestionDefinition } from '../attempts';


export const u6p5: QuestionDefinition = {
  id: 'U6P5', number: 5, title: "HOW HARD CAN ISOMERISM BE?", year: 'U6',
  points: 2, cooldownMs: 120000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Answer', fields: [
      { id: 'first', label: "First enantiomer", acceptsEdit: value => value.length <= 4 },
      { id: 'second', label: "Second enantiomer", acceptsEdit: value => value.length <= 1 }
  ] }],
  evaluate: answers => ({ answer: (answers.first ?? '').toUpperCase() === 'B' && (answers.second ?? '').toUpperCase() === 'D' || (answers.first ?? '').toUpperCase() === 'D' && (answers.second ?? '').toUpperCase() === 'B' }),
};
