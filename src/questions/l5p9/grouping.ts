import type { QuestionDefinition } from '../attempts';
/** Local tile presentation. Submission and penalties are server-authoritative. */
export function groupingReducer(items: readonly string[] | number): NonNullable<QuestionDefinition['reduce']> {
  // A protected presentation supplies its tile IDs only after authorization.
  // The local reducer bounds working; the server validates the submitted IDs.
  const count = typeof items === 'number' ? items : items.length;
  return (state, action) => {
    const selected = state.interaction?.kind === 'grouping' ? state.interaction.selected : [];
    if (action.type === 'reset') return { ...state, interaction: {kind:'grouping',selected:[]} };
    if (state.solvedAt !== null || action.now < state.retryAt) return state;
    if (action.type === 'select' && (typeof items === 'number' ? /^[a-zA-Z0-9_-]{1,80}$/.test(action.item) : items.includes(action.item)) && !selected.includes(action.item) && selected.length < count) return {...state,interaction:{kind:'grouping',selected:[...selected,action.item]}};
    return state;
  };
}
