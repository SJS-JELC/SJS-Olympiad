import type { QuestionDefinition } from '../attempts';
export const u6p1: QuestionDefinition = {
    id: 'U6P1', number: 1, title: 'Question 1', protectedContent: true, year: 'U6',
    points: 1, cooldownMs: 15000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: 'Answer', acceptsEdit: value => value.length <= 40 }
            ] }],
};
