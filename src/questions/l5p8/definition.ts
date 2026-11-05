import type { QuestionDefinition } from '../attempts';
export const l5p8: QuestionDefinition = {
    id: 'L5P8', number: 8, title: 'Question 8', protectedContent: true, year: 'L5',
    points: 3, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: 'Answer', acceptsEdit: value => value.length <= 6 },
            ] }],
};
