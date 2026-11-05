import type { QuestionDefinition } from '../attempts';
export const u6p7: QuestionDefinition = {
    id: 'U6P7', number: 7, title: 'Question 7', protectedContent: true, year: 'U6',
    points: 2, cooldownMs: 10000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: 'Answer', acceptsEdit: value => value.length <= 4 && /^[+-]?[\d.eE+-]*$/.test(value) }
            ] }],
};
