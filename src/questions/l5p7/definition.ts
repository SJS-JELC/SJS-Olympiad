import type { QuestionDefinition } from '../attempts';
export const l5p7: QuestionDefinition = {
    id: 'L5P7', number: 7, title: 'Question 7', protectedContent: true, year: 'L5',
    points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'field1', label: 'Answer', acceptsEdit: value => value.length <= 3 },
                { id: 'field2', label: 'Answer', acceptsEdit: value => value.length <= 3 },
            ] }],
};
