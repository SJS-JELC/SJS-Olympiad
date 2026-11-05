import type { QuestionDefinition } from '../attempts';
import ring from '../l6p7/assets/the-ring.png';
export const u5p4: QuestionDefinition = {
  id: 'U5P4', number: 4, title: 'Question 4', protectedContent: true, year: 'U5',
  headerArtwork: { src: ring, alt: 'The One Ring' },
  points: 1, cooldownMs: 20000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Response', fields: [{
    id: 'answer', label: 'Response', acceptsEdit: value => value.length <= 80,
  }] }],
};
