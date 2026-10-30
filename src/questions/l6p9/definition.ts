import type { QuestionDefinition } from '../attempts';
export const l6p9: QuestionDefinition = {
    id: 'L6P9', number: 9, title: "Flatland", year: 'L6',
    points: 3, cooldownMs: 30000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: "Distance between a and b in pm", fields: [{
                    id: 'answer', label: "Distance between a and b in pm", acceptsEdit: value => value.length <= 3 && /^[+-]?[\d.eE+-]*$/.test(value),
                }] }],
};
