import { ordinaryDefinitions } from './private/ordinary.mjs';
import { customInfo, reduceCustomQuestion } from './custom-questions.mjs';
export { customData as questionData } from './custom-questions.mjs';

const empty = () => ({ answers: {}, feedback: {}, retryAt: 0, solvedAt: null });
export function questionInfo(id) {
  if (typeof id !== 'string' || !/^(?:L[56]|U[56])P[1-9]$/.test(id)) return null;
  const question = ordinaryDefinitions.get(id);
  return question ? { id: question.id, year: question.year, points: question.points, cooldownMs: question.cooldownMs } : customInfo(id);
}

/** Accept a compact semantic snapshot. Undo stacks and presentation history never persist. */
export function validateAnswers(id, answers) {
  if (!questionInfo(id)) throw new TypeError('Unknown question.');
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length > 30) throw new TypeError('Invalid answers.');
  const definition = ordinaryDefinitions.get(id);
  if (!definition) {
    if (!customInfo(id)) throw new TypeError('Unknown question.');
    const compact = {};
    for (const [key, value] of Object.entries(answers)) {
      if (key.length > 80 || typeof value !== 'string' || value.length > 1000) throw new TypeError('Invalid answer.');
      compact[key] = value;
    }
    return compact;
  }
  const fields = new Set(definition.parts.flatMap(part => part.fields.map(field => field.id)));
  const compact = {};
  for (const [key, value] of Object.entries(answers)) {
    if (id === 'U5P7' && key === 'history') continue;
    if (!fields.has(key) || typeof value !== 'string' || value.length > (['U5P2','U5P3','U5P7'].includes(id) ? 100000 : 1000)) throw new TypeError('Invalid answer.');
    if ((id === 'U5P3' && key === 'drawing') || (id === 'U5P7' && key === 'drawings')) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && parsed.kind === 'molecule') {
          compact[key] = JSON.stringify({ kind: 'molecule', graph: parsed.graph, history: [] });
          continue;
        }
      } catch { /* Malformed drawings are assessable wrong answers. */ }
    }
    compact[key] = value;
  }
  if (JSON.stringify(compact).length > 110000) throw new TypeError('Answer snapshot too large.');
  return compact;
}

/** Server time is the only clock. This boundary never returns per-part correctness. */
export function reduceQuestion(id, previous, action, now) {
  if (!Number.isFinite(now)) throw new TypeError('Invalid server time.');
  if (!questionInfo(id)) return null;
  const state = previous?.state ?? empty(), privateState = previous?.privateState ?? null;
  if (!action || typeof action !== 'object' || Array.isArray(action) || typeof action.type !== 'string') return { state, privateState, award: false };
  let answers;
  try { if (action.type === 'submit') answers = validateAnswers(id, action.answers ?? {}); }
  catch { return { state, privateState, award: false }; }
  const definition = ordinaryDefinitions.get(id);
  if (!definition) return reduceCustomQuestion(id, previous, action.type === 'submit' ? { ...action, answers } : action, now);
  if (action.type !== 'submit' || state.solvedAt !== null || now < state.retryAt) return { state, privateState, award: false };
  // The phase selector historically ignores incomplete submissions.
  if (definition.allowIncompleteSubmission === false && definition.parts.some(part => part.fields.some(field => !answers[field.id]?.trim()))) return { state, privateState, award: false };
  let correct = false;
  try {
    const parts = definition.evaluate(answers);
    correct = definition.parts.every(part => parts[part.id] === true);
  } catch { /* Malformed chemical graphs are wrong, never an unhandled exception. */ }
  return {
    state: { ...state, answers, feedback: { answer: correct }, retryAt: correct ? 0 : now + definition.cooldownMs, solvedAt: correct ? now : null },
    privateState,
    award: correct,
  };
}
