// Private server marking. Migrated from the approved question definition; never import into browser code.
export const u6p1 = {
    id: 'U6P1', number: 1, title: "NICE, SIMPLE NMR", year: 'U6',
    points: 1, cooldownMs: 15000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "Molecule name", acceptsEdit: value => value.length <= 40 }
            ] }],
    evaluate: answers => ({ answer: (answers.answer ?? '').trim().replaceAll(' ', '').toLowerCase() === "4-hydroxycyclohexanone" }),
};
