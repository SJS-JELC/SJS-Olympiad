import type { QuestionDefinition } from '../attempts';
export const l5p3: QuestionDefinition = {
    id: 'L5P3', number: 3, title: "TAKING THE STABILISERS OFF", year: 'L5',
    points: 1, cooldownMs: 15000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "Name of the other molecule", acceptsEdit: value => value.length <= 40 },
            ] }],
};
