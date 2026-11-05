import type { QuestionDefinition } from '../attempts';
export const l5p1: QuestionDefinition = {
    id: 'L5P1', number: 1, title: 'Question 1', protectedContent: true, year: 'L5',
    points: 1, cooldownMs: 30000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [{
                    id: 'answer', label: 'Answer', acceptsEdit: value => value.length <= 40,
                }] }],
};
