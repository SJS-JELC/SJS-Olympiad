// Private server marking. Migrated from the approved question definition; never import into browser code.
const ordinary = '0123456789';
const subscripts = '₀₁₂₃₄₅₆₇₈₉';
/** The original input normalises case, ASCII spaces and digit glyphs. */
export function normaliseFormula(value, display = false) {
    return [...value.trim().replaceAll(' ', '').toUpperCase()].map(character => {
        const subscript = subscripts.indexOf(character);
        const digit = ordinary.indexOf(character);
        return display ? (digit < 0 ? character : subscripts[digit]) : (subscript < 0 ? character : ordinary[subscript]);
    }).join('');
}
/** Sum repeated element tokens as Power Fx MatchAll does; element order is immaterial. */
export function formulaCounts(value) {
    const compact = normaliseFormula(value);
    if (!/^([CHNOS][0-9]*)+$/.test(compact))
        return null;
    const counts = { C: 0, H: 0, N: 0, O: 0, S: 0 };
    for (const match of compact.matchAll(/([CHNOS])([0-9]*)/g)) {
        const count = match[2] === '' ? 1 : Number(match[2]);
        if (!Number.isFinite(count))
            return null;
        counts[match[1]] += count;
    }
    return counts;
}
export const fragmentKeys = {
    mass47: { C: 1, H: 3, N: 0, O: 0, S: 1 },
    mass74: { C: 2, H: 4, N: 1, O: 2, S: 0 },
    mass45: { C: 1, H: 1, N: 0, O: 2, S: 0 },
};
export const l5p6 = {
    id: 'L5P6', year: 'L5', number: 6, title: 'Fire in the Hole!', points: 2, cooldownMs: 20_000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [['mass47', 'Mᵣ 47.1'], ['mass74', 'Mᵣ 74'], ['mass45', 'Mᵣ 45']].map(([id, label]) => ({
        id, label, fields: [{ id, label, acceptsEdit: value => value.length <= 12 }],
    })),
    evaluate: answers => Object.fromEntries(Object.entries(fragmentKeys).map(([id, expected]) => {
        const actual = formulaCounts(answers[id] ?? '');
        return [id, actual !== null && Object.entries(expected).every(([element, count]) => actual[element] === count)];
    })),
};
