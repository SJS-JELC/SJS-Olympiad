import type { QuestionDefinition } from '../attempts';
export const l6p9: QuestionDefinition = {
    id: 'L6P9', number: 9, title: "Question 9", year: 'L6',
    points: 3, cooldownMs: 30000,
    protectedContent: true,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: "Response", fields: [{
                    id: 'answer', label: "Response", acceptsEdit: value => value.length <= 3 && /^[+-]?[\d.eE+-]*$/.test(value),
                }] }],
};
