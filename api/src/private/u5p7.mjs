// Private server marking. Migrated from the approved question definition; never import into browser code.
import { correct } from './frameworks.mjs';
export const u5p7 = { id: 'U5P9', number: 9, year: 'U5', title: 'Cut and Shut', points: 3, cooldownMs: 20000, lockCorrectParts: false, allowIncompleteSubmission: true, parts: [{ id: 'structures', label: 'Structures', fields: [{ id: 'drawings', label: 'Molecular drawings' }] }], evaluate: answers => ({ structures: correct(answers.drawings) }) };
