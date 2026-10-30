import type { QuestionDefinition } from '../attempts';
export const u5p8: QuestionDefinition = {
    id: 'U5P8', number: 8, title: 'Boundaries', year: 'U5',
    points: 3, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Volume of solution added in cm³', fields: [{
                    id: 'answer', label: 'Volume of solution added in cm³',
                    acceptsEdit: value => value.length <= 12 && /^\d*(?:\.\d*)?$/.test(value),
                }] }],
};
