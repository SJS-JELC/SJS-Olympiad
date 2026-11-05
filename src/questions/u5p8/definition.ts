import type { QuestionDefinition } from '../attempts';
export const u5p8: QuestionDefinition = {
    id: 'U5P8', number: 8, title: 'Question 8', protectedContent:true, year: 'U5',
    points: 3, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Response', fields: [{
                    id: 'answer', label: 'Response',
                    acceptsEdit: value => value.length <= 12 && /^\d*(?:\.\d*)?$/.test(value),
                }] }],
};
