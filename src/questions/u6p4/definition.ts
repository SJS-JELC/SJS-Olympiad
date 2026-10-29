import type { QuestionDefinition } from '../attempts';

const numericEquals = (value: string | undefined, expected: number) => {
  const text = (value ?? '').trim();
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) && Number(text) === expected;
};
const field = (id: string, label: string) => ({ id, label, acceptsEdit: (value: string) => value.length <= 3 && /^[+-]?\d*(?:\.\d*)?$/.test(value) });

export const u6p4: QuestionDefinition = {
  id: 'U6P4', number: 4, title: 'CHARGE HOPPER', year: 'U6',
  points: 1, cooldownMs: 60_000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Delocalised atoms', fields: [field('a', 'Molecule A'), field('b', 'Molecule B'), field('c', 'Molecule C')] }],
  evaluate: answers => ({ answer: numericEquals(answers.a, 4) && numericEquals(answers.b, 10) && numericEquals(answers.c, 8) }),
};
