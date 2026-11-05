import type { QuestionDefinition } from '../attempts';
export const l5p5: QuestionDefinition = {
    id: 'L5P5', number: 5, title: 'Question 5', protectedContent: true, year: 'L5',
    points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'field1', label: 'Answer', acceptsEdit: value => value.length <= 2 },
                { id: 'field2', label: 'Answer', acceptsEdit: value => value.length <= 2 },
                { id: 'field3', label: 'Answer', acceptsEdit: value => value.length <= 2 },
            ] }],
};
