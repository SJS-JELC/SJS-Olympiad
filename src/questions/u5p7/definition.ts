import type { QuestionDefinition } from '../attempts';
import { parseP7Drawing } from './model';
export const u5p7: QuestionDefinition = { id: 'U5P9', number: 9, year: 'U5', title: 'Question 9', protectedContent: true, points: 3, cooldownMs: 20000, lockCorrectParts: false, allowIncompleteSubmission: true, parts: [{ id: 'structures', label: 'Response', fields: [{ id: 'drawings', label: 'Response', acceptsEdit: value => parseP7Drawing(value) !== null }] }] };
