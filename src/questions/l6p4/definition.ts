import type { QuestionDefinition } from '../attempts';
export const l6p4: QuestionDefinition = {
    id: 'L6P4', year: 'L6', number: 4, title: 'Question 4', points: 1, cooldownMs: 30000,
    protectedContent: true,
    lockCorrectParts: false, allowIncompleteSubmission: false,
    parts: (['part1', 'part2'] as const).map(id => ({ id, label: 'Part', fields: Array.from({ length: 6 }, (_, index) => ({
            id: id + (index + 1), label: 'Response ' + (index + 1), acceptsEdit: value => value === '1' || value === '2',
        })) })),
};
