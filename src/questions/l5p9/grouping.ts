import type { QuestionDefinition } from '../attempts';
/** Local tile presentation. Submission and penalties are server-authoritative. */
export function groupingReducer(items: readonly string[]): NonNullable<QuestionDefinition['reduce']> {
  return (state, action) => {
    const selected = state.interaction?.kind === 'grouping' ? state.interaction.selected : [];
    if (action.type === 'reset') return { ...state, interaction: {kind:'grouping',selected:[]} };
    if (state.solvedAt !== null || action.now < state.retryAt) return state;
    if (action.type === 'select' && items.includes(action.item) && !selected.includes(action.item) && selected.length < items.length) return {...state,interaction:{kind:'grouping',selected:[...selected,action.item]}};
    return state;
  };
}
