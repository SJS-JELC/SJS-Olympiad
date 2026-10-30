import type { QuestionDefinition } from '../attempts';
import flippedEagle from '../../assets/powerapp/flipped-eagle.svg';
export const pointGroupOptions = [
    "C₁ – E",
    "Cₛ – E, σ",
    "Cᵢ – E, i",
    "C₂ – E, C₂",
    "C₂ᵥ – E, C₂, 2 × σᵥ",
    "C₂ₕ – E, C₂, σₕ, i",
    "D₂ – E, 3 × C₂",
    "D₂ₕ – E, 3 × C₂, i, 3 × σ",
    "C₃ – E, C₃",
    "C₃ᵥ – E, C₃, 3 × σᵥ",
    "D₃ – E, C₃, 3 × C₂",
    "D₃ₕ – E, C₃, 3 × C₂, σₕ, 3 × σᵥ"
] as const;
export const pointGroupLabels = { HClO: 'HClO', SF4: 'SF₄', PCl5: 'PCl₅' } as const;
export const u6p9: QuestionDefinition = {
    headerArtwork: { src: flippedEagle, alt: '' },
    id: 'U6P9', year: 'U6', number: 9, title: 'Spinning & Flipping', points: 3, cooldownMs: 30000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: (Object.keys(pointGroupLabels) as (keyof typeof pointGroupLabels)[]).map(id => ({ id, label: pointGroupLabels[id], fields: [{
                id, label: pointGroupLabels[id], acceptsEdit: value => value === '' || pointGroupOptions.some(option => option === value),
            }] })),
};
