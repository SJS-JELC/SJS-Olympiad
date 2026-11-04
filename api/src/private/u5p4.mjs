// Server-only marking: never import into browser code.
export const u5p4 = {
  id: 'U5P4', number: 4, title: 'Rings of Power', year: 'U5',
  points: 1, cooldownMs: 20000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', fields: [{ id: 'answer' }] }],
  evaluate: answers => ({ answer: (answers.answer ?? '').toLowerCase()
    .replace(/\s/g, '').replace(/[\u2010-\u2013\u2212]/g, '-') === '1,4-oxazepine' }),
};
