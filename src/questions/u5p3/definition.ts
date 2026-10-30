import type { QuestionDefinition } from '../attempts';
import {parseMoleculeAnswer} from './moleculeAnswer';
export const u5p3Definition: QuestionDefinition = {
    id: 'U5P3', number: 3, title: 'Chainspotting', year: 'U5', points: 1, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'monomers', label: 'Alkene monomers', fields: [
                { id: 'drawing', label: 'Molecular drawing', acceptsEdit: value => parseMoleculeAnswer(value) !== null },
            ] }],
};
