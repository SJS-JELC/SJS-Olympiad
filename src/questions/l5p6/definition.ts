import type { QuestionDefinition } from '../attempts';
const ordinary = '0123456789';
const subscripts = '₀₁₂₃₄₅₆₇₈₉';
/** The original input normalises case, ASCII spaces and digit glyphs. */
export function normaliseFormula(value: string, display = false): string {
    return [...value.trim().replaceAll(' ', '').toUpperCase()].map(character => {
        const subscript = subscripts.indexOf(character);
        const digit = ordinary.indexOf(character);
        return display ? (digit < 0 ? character : subscripts[digit]) : (subscript < 0 ? character : ordinary[subscript]);
    }).join('');
}
export const l5p6: QuestionDefinition = {
    id: 'L5P6', year: 'L5', number: 6, title: 'Fire in the Hole!', points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [['mass47', 'Mᵣ 47.1'], ['mass74', 'Mᵣ 74'], ['mass45', 'Mᵣ 45']].map(([id, label]) => ({
        id, label, fields: [{ id, label, acceptsEdit: value => value.length <= 12 }],
    })),
};
