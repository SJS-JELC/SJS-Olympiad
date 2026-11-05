import type { QuestionDefinition } from '../attempts';
const field = (id: string, label: string) => ({ id, label, acceptsEdit: (value: string) => value.length <= 3 && /^[+-]?\d*(?:\.\d*)?$/.test(value) });
export const u6p4: QuestionDefinition = {
    id: 'U6P4', number: 4, title: 'Question 4', protectedContent: true, year: 'U6',
    points: 1, cooldownMs: 60000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [field('a', 'Answer 1'), field('b', 'Answer 2'), field('c', 'Answer 3')] }],
};
