import type { QuestionDefinition } from '../attempts';
import goblin from './assets/goblin.png';
export const l5p4: QuestionDefinition = {
    id: 'L5P4', number: 4, title: 'Question 4', protectedContent: true, year: 'L5',
    headerArtwork: { src: goblin, alt: 'Goblin' },
    points: 1, cooldownMs: 30000,
    lockCorrectParts: false, allowIncompleteSubmission: true,
    parts: [{ id: 'answer', label: 'Answer', fields: [
                { id: 'answer', label: 'Answer', acceptsEdit: value => value.length <= 40 },
            ] }],
};
