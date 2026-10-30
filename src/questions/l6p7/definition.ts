import type { QuestionDefinition } from '../attempts';
import ring from './assets/the-ring.png';

export const l6p7: QuestionDefinition = {
  id: 'L6P7', number: 7, title: 'Rings of Power', year: 'L6',
  headerArtwork: { src: ring, alt: 'The One Ring' },
  points: 2, cooldownMs: 20000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Name of the other molecule', fields: [{
    id: 'answer', label: 'Name of the other molecule', acceptsEdit: value => value.length <= 40,
  }] }],
};
