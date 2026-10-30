import type { QuestionDefinition } from '../attempts';
export const l6p2: QuestionDefinition = {
    id: 'L6P2', number: 2, title: "Chariots Pulled by Cats", year: 'L6',
    points: 1, cooldownMs: 30000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: "Element symbol", fields: [{
                    id: 'answer', label: "Element symbol", acceptsEdit: value => value.length <= 40,
                }] }],
};
