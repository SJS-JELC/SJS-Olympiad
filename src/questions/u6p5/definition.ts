import type { QuestionDefinition } from '../attempts';
export const u6p5: QuestionDefinition = {
    id: 'U6P5', number: 5, title: 'Question 5', protectedContent: true, year: 'U6',
    points: 2, cooldownMs: 120000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'first', label: 'Answer', acceptsEdit: value => value.length <= 4 },
                { id: 'second', label: 'Answer', acceptsEdit: value => value.length <= 1 }
            ] }],
};
