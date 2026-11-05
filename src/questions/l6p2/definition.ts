import type { QuestionDefinition } from '../attempts';
export const l6p2: QuestionDefinition = {
    id: 'L6P2', number: 2, title: "Question 2", year: 'L6',
    points: 1, cooldownMs: 30000,
    protectedContent: true,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: "Response", fields: [{
                    id: 'answer', label: "Response", acceptsEdit: value => value.length <= 40,
                }] }],
};
