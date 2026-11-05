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
    id: 'L5P6', year: 'L5', number: 6, title: 'Question 6', protectedContent: true, points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: ['field1', 'field2', 'field3'].map(id => ({
        id, label: 'Answer', fields: [{ id, label: 'Answer', acceptsEdit: value => value.length <= 12 }],
    })),
};
