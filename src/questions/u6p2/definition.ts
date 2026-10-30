import type { QuestionDefinition } from '../attempts';
export const u6p2: QuestionDefinition = {
    id: 'U6P2', number: 2, title: "HOT STUFF", year: 'U6',
    points: 1, cooldownMs: 10000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "Final temperature (°C)", acceptsEdit: value => value.length <= 6 && /^[+-]?[\d.eE+-]*$/.test(value) }
            ] }],
};
