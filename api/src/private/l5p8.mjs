// Private server marking. Migrated from the approved question definition; never import into browser code.
const numeric = (value) => {
    const text = (value ?? '').trim();
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ? Number(text) : NaN;
};
export const l5p8 = {
    id: 'L5P8', number: 8, title: "ALKANE ISOTOPES", year: 'L5',
    points: 3, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "n =", acceptsEdit: value => value.length <= 6 },
            ] }],
    evaluate: answers => ({ answer: numeric(answers.answer) === 90 }),
};
