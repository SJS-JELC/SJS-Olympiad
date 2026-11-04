import type { QuestionDefinition } from '../attempts';
import ring from '../l6p7/assets/the-ring.png';
export const u5p4: QuestionDefinition = {
  id: 'U5P4', number: 4, title: 'Rings of Power', year: 'U5',
  headerArtwork: { src: ring, alt: 'The One Ring' },
  points: 1, cooldownMs: 20000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Name of the sixth molecule', fields: [{
    id: 'answer', label: 'Name of the sixth molecule', acceptsEdit: value => value.length <= 80,
  }] }],
};
