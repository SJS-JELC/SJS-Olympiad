import type { QuestionDefinition } from '../attempts';
import spiroDragon from './assets/spiro-dragon.png';


export const u6p3: QuestionDefinition = {
  headerArtwork: { src: spiroDragon, alt: '', className: 'u6p3-header-dragon' },
  id: 'U6P3', number: 3, title: "SPYRO", year: 'U6',
  points: 1, cooldownMs: 30000,
  lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Answer', fields: [
      { id: 'answer', label: "Molecule name", acceptsEdit: value => value.length <= 40 }
  ] }],
  evaluate: answers => ({ answer: (answers.answer ?? '').trim().toLowerCase() === "6-methylspiro[2.3]hexan-4-ol" }),
};
