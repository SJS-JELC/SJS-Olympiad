import type { QuestionDefinition } from '../attempts';
const field = (id: string, label: string) => ({ id, label, acceptsEdit: (value: string) => value.length <= 3 && /^[+-]?\d*(?:\.\d*)?$/.test(value) });
export const u6p4: QuestionDefinition = {
    id: 'U6P4', number: 4, title: 'CHARGE HOPPER', year: 'U6',
    points: 1, cooldownMs: 60000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Delocalised atoms', fields: [field('a', 'Molecule A'), field('b', 'Molecule B'), field('c', 'Molecule C')] }],
};
