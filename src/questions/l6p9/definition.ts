import type { QuestionDefinition } from '../attempts';

const numericValue = (value: string | undefined): number | null => {
  const text = (value ?? '').trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null;
  const result = Number(text);
  return Number.isFinite(result) ? result : null;
};

export const l6p9: QuestionDefinition = {
  id: 'L6P9', number: 9, title: "Flatland", year: 'L6',
  points: 3, cooldownMs: 30000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: "Distance between a and b in pm", fields: [{
    id: 'answer', label: "Distance between a and b in pm", acceptsEdit: value => value.length <= 3 && /^[+-]?[\d.eE+-]*$/.test(value),
  }] }],
  evaluate: answers => ({ answer: numericValue(answers.answer) !== null && [295].includes(numericValue(answers.answer)!) }),
};
