import type { QuestionDefinition } from '../attempts';
export const u5p6: QuestionDefinition = {
    id: 'U5P6', number: 6, title: 'Cubane', year: 'U5',
    points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Greatest hydrogen separation in pm', fields: [{
                    id: 'answer', label: 'Greatest hydrogen separation in pm',
                    acceptsEdit: value => value.length <= 8 && /^[\d.eE+\-]*$/.test(value),
                }] }],
};
