// Private server marking. Migrated from the approved question definition; never import into browser code.
const numericValue = (value) => {
    const text = (value ?? '').trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
        return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
};
export const u6p6 = {
    id: 'U6P6', number: 6, title: "JUMBO MASS SPECTROMETRY", year: 'U6',
    points: 2, cooldownMs: 10000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "Molecular mass", acceptsEdit: value => value.length <= 8 && /^[+-]?[\d.eE+-]*$/.test(value) }
            ] }],
    evaluate: answers => ({ answer: numericValue(answers.answer) === 29808 }),
};
