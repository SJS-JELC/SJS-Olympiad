// Private server marking. Migrated from the approved question definition; never import into browser code.
const numeric = (value) => {
    const text = (value ?? '').trim();
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ? Number(text) : NaN;
};
export const l5p7 = {
    id: 'L5P7', number: 7, title: "CRYSTAL CLEAR", year: 'L5',
    points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'perovskite', label: "Perovskite", acceptsEdit: value => value.length <= 3 },
                { id: 'gan', label: "Gallium Nitride", acceptsEdit: value => value.length <= 3 },
            ] }],
    evaluate: answers => ({ answer: numeric(answers.perovskite) === 5 && numeric(answers.gan) === 4 }),
};
