/** The persistent theory record is an outcome, never a copy of the pupil's work.
 * Apply on reads too: historical rows/receipts stay untouched but cannot restore
 * old answers or laboratory history. Practical records use a separate contract.
 */
export function retainedAttempt(id, state) {
  const result = { answers: {}, feedback: state.feedback ?? {}, retryAt: state.retryAt ?? 0, solvedAt: state.solvedAt ?? null };
  const run = state.interaction;
  if (id === 'L6P3' && run?.kind === 'timed') {
    result.interaction = { kind: 'timed', formula: run.active ? run.formula : null,
      step: run.step, deadline: run.deadline, active: !!run.active,
      wrongUntil: run.active ? run.wrongUntil : 0, revealed: run.active ? null : run.revealed ?? null };
  }
  if (id === 'U5P5') {
    const activeRun = state.solvedAt == null && run?.kind === 'gc' ? run.activeRun ?? null : null;
    result.interaction = { kind: 'gc', entered: !!activeRun, activeRun,
      nextRunId: run?.kind === 'gc' ? run.nextRunId ?? 1 : 1,
      analyses: [], reference: 'citrus', interval: [.5, .7], measurements: [], results: [] };
  }
  return result;
}

export function retainedQuestion(id, question) {
  const state = retainedAttempt(id, question.state);
  // Row IDs are enough to recover the private sequence. Old full CSV rows are
  // accepted only as read input, then compacted on the next authorized write.
  const sequence = question.privateState?.run;
  const privateState = id === 'L6P3' && state.interaction?.active && Array.isArray(sequence)
    ? { run: sequence.map(row => typeof row === 'number' ? row : row.row) } : {};
  return { ...question, state, privateState };
}

/** Receipt snapshots contain the canonical outcome without raw work or traces.
 * A Run's input remains in the frozen request in page memory. Hydration supplies
 * the active sample from the current question row, never from historical receipts.
 */
export function retainedResponse(id, response, receipt = false) {
  const attempt = retainedAttempt(id, response.attempt);
  if (receipt && attempt.interaction?.kind === 'gc' && attempt.interaction.activeRun) {
    const { id: runId, startedAt, deadline } = attempt.interaction.activeRun;
    attempt.interaction = { ...attempt.interaction, activeRun: { id: runId, startedAt, deadline } };
  }
  const { data: _data, ...metadata } = response;
  return { ...metadata, attempt };
}
