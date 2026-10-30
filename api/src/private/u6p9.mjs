// Private server marking. Migrated from the approved question definition; never import into browser code.
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
];
export const pointGroupKeys = { HClO: 'Cₛ – E, σ', SF4: 'C₂ᵥ – E, C₂, 2 × σᵥ', PCl5: 'D₃ₕ – E, C₃, 3 × C₂, σₕ, 3 × σᵥ' };
export const pointGroupLabels = { HClO: 'HClO', SF4: 'SF₄', PCl5: 'PCl₅' };
export const u6p9 = {
    id: 'U6P9', year: 'U6', number: 9, title: 'Spinning & Flipping', points: 3, cooldownMs: 30_000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: Object.keys(pointGroupKeys).map(id => ({ id, label: pointGroupLabels[id], fields: [{
                id, label: pointGroupLabels[id], acceptsEdit: value => value === '' || pointGroupOptions.some(option => option === value),
            }] })),
    evaluate: answers => Object.fromEntries(Object.entries(pointGroupKeys).map(([id, key]) => [id, answers[id] === key])),
};
