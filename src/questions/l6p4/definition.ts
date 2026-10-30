import type { QuestionDefinition } from '../attempts';
export const l6p4: QuestionDefinition = {
    id: 'L6P4', year: 'L6', number: 4, title: 'Superposition', points: 1, cooldownMs: 30000,
    lockCorrectParts: false, allowIncompleteSubmission: false,
    parts: (['HOMO', 'LUMO'] as const).map(id => ({ id, label: id, fields: Array.from({ length: 6 }, (_, index) => ({
            id: id + (index + 1), label: id + ' orbital ' + (index + 1), acceptsEdit: value => value === '1' || value === '2',
        })) })),
};
