import type { QuestionDefinition } from '../attempts';
import {parseMoleculeAnswer} from './moleculeAnswer';
export const u5p3Definition: QuestionDefinition = {
    id: 'U5P3', number: 3, title: 'Question 3', protectedContent: true, year: 'U5', points: 1, cooldownMs: 20000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Response', fields: [
                { id: 'drawing', label: 'Response', acceptsEdit: value => parseMoleculeAnswer(value) !== null },
            ] }],
};
