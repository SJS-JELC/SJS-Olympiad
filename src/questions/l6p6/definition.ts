import type { QuestionDefinition } from '../attempts';
export const l6p6: QuestionDefinition = {
    id: 'L6P6', number: 6, title: "Question 6", year: 'L6',
    points: 2, cooldownMs: 20000,
    protectedContent: true,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: "Response", fields: [{
                    id: 'answer', label: "Response", acceptsEdit: value => value.length <= 2 && /^[+-]?[\d.eE+-]*$/.test(value),
                }] }],
};
