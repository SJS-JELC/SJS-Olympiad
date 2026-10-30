// Private server marking. Migrated from the approved question definition; never import into browser code.
const numericValue = (value) => {
    const text = (value ?? '').trim();
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
        return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
};
export const u6p2 = {
    id: 'U6P2', number: 2, title: "HOT STUFF", year: 'U6',
    points: 1, cooldownMs: 10000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: "Final temperature (°C)", acceptsEdit: value => value.length <= 6 && /^[+-]?[\d.eE+-]*$/.test(value) }
            ] }],
    evaluate: answers => ({ answer: numericValue(answers.answer) === 28.5 }),
};
