// Private server marking. Migrated from the approved question definition; never import into browser code.
const numericValue = (value) => {
    const text = (value ?? '').trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
        return null;
    const result = Number(text);
    return Number.isFinite(result) ? result : null;
};
export const l6p6 = {
    id: 'L6P6', number: 6, title: "Radical Mess", year: 'L6',
    points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: "Number of organic molecules", fields: [{
                    id: 'answer', label: "Number of organic molecules", acceptsEdit: value => value.length <= 2 && /^[+-]?[\d.eE+-]*$/.test(value),
                }] }],
    evaluate: answers => ({ answer: numericValue(answers.answer) !== null && [30, 36].includes(numericValue(answers.answer)) }),
};
