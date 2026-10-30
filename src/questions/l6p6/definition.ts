import type { QuestionDefinition } from '../attempts';
export const l6p6: QuestionDefinition = {
    id: 'L6P6', number: 6, title: "Radical Mess", year: 'L6',
    points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: "Number of organic molecules", fields: [{
                    id: 'answer', label: "Number of organic molecules", acceptsEdit: value => value.length <= 2 && /^[+-]?[\d.eE+-]*$/.test(value),
                }] }],
};
