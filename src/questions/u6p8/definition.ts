import type { QuestionDefinition } from '../attempts';
export const u6p8: QuestionDefinition = {
    id: 'U6P8', number: 8, title: 'Question 8', protectedContent: true, year: 'U6',
    points: 3, cooldownMs: 10000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'field1', label: 'Answer', acceptsEdit: value => value.length <= 6 && /^[+-]?[\d.eE+-]*$/.test(value) },
                { id: 'field2', label: 'Answer', acceptsEdit: value => value.length <= 6 && /^[+-]?[\d.eE+-]*$/.test(value) }
            ] }],
};
