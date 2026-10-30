import type { QuestionDefinition } from '../attempts';
export const l5p5: QuestionDefinition = {
    id: 'L5P5', number: 5, title: "HAVEN'T I SEEN YOU BEFORE?", year: 'L5',
    points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'c2h4o', label: "C₂H₄O", acceptsEdit: value => value.length <= 2 },
                { id: 'c4h8', label: "C₄H₈", acceptsEdit: value => value.length <= 2 },
                { id: 'c3h9n', label: "C₃H₉N", acceptsEdit: value => value.length <= 2 },
            ] }],
};
