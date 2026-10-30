// Private server marking. Migrated from the approved question definition; never import into browser code.
export const l6p2 = {
    id: 'L6P2', number: 2, title: "Chariots Pulled by Cats", year: 'L6',
    points: 1, cooldownMs: 30000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: "Element symbol", fields: [{
                    id: 'answer', label: "Element symbol", acceptsEdit: value => value.length <= 40,
                }] }],
    evaluate: answers => ({ answer: (answers.answer ?? '').trim().replaceAll(' ', '').toLowerCase() === 'v' }),
};
