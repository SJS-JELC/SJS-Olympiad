// Private server marking. Migrated from the approved question definition; never import into browser code.
export const u6p7 = {
    id: 'U6P7', number: 7, title: "PROPANE'S CLOSEST ENCOUNTER", year: 'U6',
    points: 2, cooldownMs: 10000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "Distance (pm)", acceptsEdit: value => value.length <= 4 && /^[+-]?[\d.eE+-]*$/.test(value) }
            ] }],
    evaluate: answers => ({ answer: answers.answer === "192" }),
};
