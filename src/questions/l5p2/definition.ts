import type { QuestionDefinition } from '../attempts';
export const l5p2: QuestionDefinition = {
    id: 'L5P2', number: 2, title: 'Question 2', protectedContent: true, year: 'L5',
    points: 1, cooldownMs: 15000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: 'Answer', acceptsEdit: value => value.length <= 6 },
            ] }],
};
