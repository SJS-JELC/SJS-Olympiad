import type { QuestionDefinition } from '../attempts';
export const u6p8: QuestionDefinition = {
    id: 'U6P8', number: 8, title: "SPEEDY", year: 'U6',
    points: 3, cooldownMs: 10000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'sn1', label: "SN1 (%)", acceptsEdit: value => value.length <= 6 && /^[+-]?[\d.eE+-]*$/.test(value) },
                { id: 'sn2', label: "SN2 (%)", acceptsEdit: value => value.length <= 6 && /^[+-]?[\d.eE+-]*$/.test(value) }
            ] }],
};
