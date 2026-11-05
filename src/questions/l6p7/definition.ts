import type { QuestionDefinition } from '../attempts';
import ring from './assets/the-ring.png';

export const l6p7: QuestionDefinition = {
  id: 'L6P7', number: 7, title: 'Question 7', year: 'L6',
  headerArtwork: { src: ring, alt: 'The One Ring' },
  points: 2, cooldownMs: 20000,
  protectedContent: true,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Response', fields: [{
    id: 'answer', label: 'Response', acceptsEdit: value => value.length <= 40,
  }] }],
};
