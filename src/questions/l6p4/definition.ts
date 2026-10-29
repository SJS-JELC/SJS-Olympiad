import type { Answers, QuestionDefinition } from '../attempts';

export const orbitalKeys = { HOMO: ['1', '1', '2', '2', '1', '1'], LUMO: ['1', '2', '2', '1', '1', '2'] } as const;
function matchesPhase(answers: Answers, orbital: keyof typeof orbitalKeys): boolean {
  const expected = orbitalKeys[orbital];
  const actual = expected.map((_, index) => answers[orbital + (index + 1)]);
  return expected.every((phase, index) => actual[index] === phase) ||
    expected.every((phase, index) => actual[index] === (phase === '1' ? '2' : '1'));
}
export const l6p4: QuestionDefinition = {
  id: 'L6P4', year: 'L6', number: 4, title: 'Superposition', points: 1, cooldownMs: 30_000,
  lockCorrectParts: false, allowIncompleteSubmission: false,
  parts: (['HOMO', 'LUMO'] as const).map(id => ({ id, label: id, fields: orbitalKeys[id].map((_, index) => ({
    id: id + (index + 1), label: id + ' orbital ' + (index + 1), acceptsEdit: value => value === '1' || value === '2',
  })) })),
  evaluate: answers => ({ HOMO: matchesPhase(answers, 'HOMO'), LUMO: matchesPhase(answers, 'LUMO') }),
};
