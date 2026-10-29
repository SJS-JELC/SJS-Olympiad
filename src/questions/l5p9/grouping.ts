import type { Attempt, AttemptAction, QuestionDefinition } from '../attempts';

/** Validate partitions, independent of the colour/group or selection order. */
export function matchesGroups(selected: readonly string[], items: readonly string[], key: readonly (readonly string[])[]): boolean {
  if (selected.length !== items.length || new Set(selected).size !== items.length || selected.some(item => !items.includes(item))) return false;
  const groups = Array.from({ length: 3 }, (_, index) => selected.slice(index * 3, index * 3 + 3));
  return key.every(expected => groups.some(actual => expected.length === actual.length && expected.every(item => actual.includes(item))));
}

export function groupingReducer(items: readonly string[], key: readonly (readonly string[])[], cooldownMs: number): NonNullable<QuestionDefinition['reduce']> {
  return (state: Attempt, action: AttemptAction): Attempt => {
    const selected = state.interaction?.kind === 'grouping' ? state.interaction.selected : [];
    // Reset is deliberately local and always available, including during timeout or after solving.
    if (action.type === 'reset') {
      return { ...state, interaction: { kind: 'grouping', selected: [] } };
    }
    if (state.solvedAt !== null || action.now < state.retryAt) return state;
    if (action.type === 'select') {
      if (!items.includes(action.item) || selected.includes(action.item) || selected.length >= items.length) return state;
      return { ...state, interaction: { kind: 'grouping', selected: [...selected, action.item] } };
    }
    if (action.type !== 'submit' || selected.length !== items.length) return state;
    const solved = matchesGroups(selected, items, key);
    return { ...state, feedback: { groups: solved }, retryAt: solved ? 0 : action.now + cooldownMs, solvedAt: solved ? action.now : null };
  };
}
