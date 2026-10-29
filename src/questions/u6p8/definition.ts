import type { QuestionDefinition } from '../attempts';

const numericValue = (value: string | undefined): number | null => {
  const text = (value ?? '').trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
};

export const u6p8: QuestionDefinition = {
  id: 'U6P8', number: 8, title: "SPEEDY", year: 'U6',
  points: 3, cooldownMs: 10000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Answer', fields: [
      { id: 'sn1', label: "SN1 (%)", acceptsEdit: value => value.length <= 6 && /^[+-]?[\d.eE+-]*$/.test(value) },
      { id: 'sn2', label: "SN2 (%)", acceptsEdit: value => value.length <= 6 && /^[+-]?[\d.eE+-]*$/.test(value) }
  ] }],
  evaluate: answers => ({ answer: numericValue(answers.sn1) !== null && numericValue(answers.sn2) !== null && Math.round(numericValue(answers.sn1)! * 10) / 10 === 60.3 && Math.round(numericValue(answers.sn2)! * 10) / 10 === 39.7 }),
};
