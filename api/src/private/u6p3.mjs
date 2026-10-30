// Private server marking. Migrated from the approved question definition; never import into browser code.
export const u6p3 = {
    id: 'U6P3', number: 3, title: "SPYRO", year: 'U6',
    points: 1, cooldownMs: 30000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "Molecule name", acceptsEdit: value => value.length <= 40 }
            ] }],
    evaluate: answers => ({ answer: (answers.answer ?? '').trim().toLowerCase() === "6-methylspiro[2.3]hexan-4-ol" }),
};
