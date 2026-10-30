// Private server marking. Migrated from the approved question definition; never import into browser code.
export const normalizeMoleculeName = (value) => value.trim().toLowerCase().replace(/[ ()\-,]/g, '');
export const l6p7 = {
    id: 'L6P7', number: 7, title: "Rings of Power", year: 'L6',
    points: 2, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: "Name of the other molecule", fields: [{
                    id: 'answer', label: "Name of the other molecule", acceptsEdit: value => value.length <= 40,
                }] }],
    evaluate: answers => ({ answer: ["zbut2enedioicacid", "zbutenedioicacid", "cisbut2enedioicacid", "cisbutenedioicacid", "maleicacid"].includes(normalizeMoleculeName(answers.answer ?? '')) }),
};
