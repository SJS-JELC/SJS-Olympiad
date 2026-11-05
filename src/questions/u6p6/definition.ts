import type { QuestionDefinition } from '../attempts';
export const u6p6: QuestionDefinition = {
    id: 'U6P6', number: 6, title: 'Question 6', protectedContent: true, year: 'U6',
    points: 2, cooldownMs: 10000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: 'Answer', acceptsEdit: value => value.length <= 8 && /^[+-]?[\d.eE+-]*$/.test(value) }
            ] }],
};
