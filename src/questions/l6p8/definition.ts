import type { QuestionDefinition } from '../attempts';
export const l6p8: QuestionDefinition = {
    id: 'L6P8', number: 8, title: "Question 8", year: 'L6',
    points: 3, cooldownMs: 15000,
    protectedContent: true,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: "Response", fields: [{
                    id: 'answer', label: "Response", acceptsEdit: value => value.length <= 6 && /^[+-]?[\d.eE+-]*$/.test(value),
                }] }],
};
