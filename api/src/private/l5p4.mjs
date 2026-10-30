// Private server marking. Migrated from the approved question definition; never import into browser code.
export const l5p4 = {
    id: 'L5P4', number: 4, title: "GOBLINS", year: 'L5',
    points: 1, cooldownMs: 30000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "Symbol of the mystery element", acceptsEdit: value => value.length <= 40 },
            ] }],
    evaluate: answers => ({ answer: (answers.answer ?? '').trim().replaceAll(' ', '').toLowerCase() === 'co' }),
};
