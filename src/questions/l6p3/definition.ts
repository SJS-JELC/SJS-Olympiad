import type { Attempt, QuestionDefinition, TimedInteraction } from '../attempts';
export const RUN_MS = 75_000;
export const GO_COOLDOWN_MS = 20_000;
export const WRONG_FLASH_MS = 500;
export const timedState = (attempt: Attempt): TimedInteraction | undefined => attempt.interaction?.kind === 'timed' ? attempt.interaction : undefined;

export const l6p3: QuestionDefinition = {
  id: 'L6P3', number: 3, title: 'Who Ate All the Names?', year: 'L6',
  points: 1, cooldownMs: GO_COOLDOWN_MS, lockCorrectParts: false, allowIncompleteSubmission: true,
  parts: [{ id: 'answer', label: 'Oxyanion name', fields: [{ id: 'answer', label: 'Oxyanion name' }] }],
  // Five sequential correct submissions are the only successful marking route.
};
