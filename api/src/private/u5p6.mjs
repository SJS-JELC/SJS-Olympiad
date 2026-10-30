// Private server marking. Migrated from the approved question definition; never import into browser code.
const numericValue = (value) => {
    const text = (value ?? '').trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
        return null;
    const result = Number(text);
    return Number.isFinite(result) ? result : null;
};
export const u5p6 = {
    id: 'U5P6', number: 6, title: 'Cubane', year: 'U5',
    points: 2, cooldownMs: 20_000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Greatest hydrogen separation in pm', fields: [{
                    id: 'answer', label: 'Greatest hydrogen separation in pm',
                    acceptsEdit: value => value.length <= 8 && /^[\d.eE+\-]*$/.test(value),
                }] }],
    evaluate: answers => ({ answer: numericValue(answers.answer) === 485 }),
};
