import type { QuestionDefinition } from '../attempts';
import cubone from './assets/cubone.svg';
export const u5p6: QuestionDefinition = {
    id: 'U5P6', number: 6, title: 'Question 6', protectedContent: true, year: 'U5',
    headerArtwork: { src: cubone, alt: 'Cubone' },
    points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Response', fields: [{
                    id: 'answer', label: 'Response',
                    acceptsEdit: value => value.length <= 8 && /^[\d.eE+\-]*$/.test(value),
                }] }],
};
