import type { QuestionDefinition } from '../attempts';
/** Marking transcribed from appCodexL6Problem5.txt; angles are degrees, not modulo 360. */
export const l6p5: QuestionDefinition = {
    id: 'L6P5', number: 5, title: 'Question 5', year: 'L6', points: 2, cooldownMs: 20000,
    protectedContent: true,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [1, 2, 3].map(number => ({
        id: 'molecule' + number, label: 'Part ' + number,
        fields: [
            { id: 'molecule' + number + 'Minimum', label: 'Response 1', acceptsEdit: value => /^\d{0,3}$/.test(value) },
            { id: 'molecule' + number + 'Maximum', label: 'Response 2', acceptsEdit: value => /^\d{0,3}$/.test(value) },
        ],
    })),
};
