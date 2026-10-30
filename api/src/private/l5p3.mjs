// Private server marking. Migrated from the approved question definition; never import into browser code.
export const l5p3 = {
    id: 'L5P3', number: 3, title: "TAKING THE STABILISERS OFF", year: 'L5',
    points: 1, cooldownMs: 15000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "Name of the other molecule", acceptsEdit: value => value.length <= 40 },
            ] }],
    evaluate: answers => ({ answer: (answers.answer ?? '').trim().toLowerCase() === 'bicyclo[4.3.1]decane' }),
};
