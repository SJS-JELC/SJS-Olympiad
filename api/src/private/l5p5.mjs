// Private server marking. Migrated from the approved question definition; never import into browser code.
const numeric = (value) => {
    const text = (value ?? '').trim();
    return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ? Number(text) : NaN;
};
export const l5p5 = {
    id: 'L5P5', number: 5, title: "HAVEN'T I SEEN YOU BEFORE?", year: 'L5',
    points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'c2h4o', label: "C₂H₄O", acceptsEdit: value => value.length <= 2 },
                { id: 'c4h8', label: "C₄H₈", acceptsEdit: value => value.length <= 2 },
                { id: 'c3h9n', label: "C₃H₉N", acceptsEdit: value => value.length <= 2 },
            ] }],
    evaluate: answers => ({ answer: numeric(answers.c2h4o) === 3 && [5, 6].includes(numeric(answers.c4h8)) && numeric(answers.c3h9n) === 4 }),
};
