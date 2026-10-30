import type { QuestionDefinition } from '../attempts';
export const u6p6: QuestionDefinition = {
    id: 'U6P6', number: 6, title: "JUMBO MASS SPECTROMETRY", year: 'U6',
    points: 2, cooldownMs: 10000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "Molecular mass", acceptsEdit: value => value.length <= 8 && /^[+-]?[\d.eE+-]*$/.test(value) }
            ] }],
};
