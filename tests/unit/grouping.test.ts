import { describe, expect, it } from 'vitest';
import { emptyAttempt, score, transition, type Attempt } from '../../src/questions/attempts';
import { l5p9, l5p9Items, l5p9Groups } from '../../src/questions/l5p9/definition';
import { l6p1, l6p1Items, l6p1Groups } from '../../src/questions/l6p1/definition';

const cases = [
  { definition: l5p9, items: l5p9Items, groups: l5p9Groups },
  { definition: l6p1, items: l6p1Items, groups: l6p1Groups },
];
function permutations<T>(values: readonly T[]): T[][] {
  if (!values.length) return [[]];
  return values.flatMap((value, index) => permutations(values.filter((_, candidate) => candidate !== index)).map(rest => [value, ...rest]));
}
for (const { definition, items, groups } of cases) {
  const select = (order: readonly string[], now = 0, initial = emptyAttempt()) => order.reduce((state, item) => transition(definition, state, { type: 'select', item, now }), initial);
  const submit = (state: Attempt, now = 1000) => transition(definition, state, { type: 'submit', now });
  describe(definition.id + ' source-faithful grouping interaction', () => {
    it('accepts every within-group and between-group permutation', () => {
      for (const groupOrder of permutations<readonly string[]>(groups)) {
        for (const first of permutations(groupOrder[0])) for (const second of permutations(groupOrder[1])) for (const third of permutations(groupOrder[2])) {
          const solved = submit(select([...first, ...second, ...third]), 0);
          expect(solved.solvedAt).toBe(0);
          expect(score([definition], { [definition.id]: solved })).toBe(definition.points);
          expect(submit(solved)).toBe(solved);
        }
      }
    });
    it('ignores blank and incomplete checks, duplicate and unknown selections', () => {
      const blank = emptyAttempt(); expect(submit(blank)).toBe(blank);
      const partial = select(groups[0]); expect(submit(partial)).toBe(partial);
      expect(transition(definition, partial, { type: 'select', item: groups[0][0], now: 0 })).toBe(partial);
      expect(transition(definition, partial, { type: 'select', item: 'unknown', now: 0 })).toBe(partial);
      expect(transition(definition, partial, { type: 'edit', field: 'groups', value: groups.flat().join(','), now: 0 })).toBe(partial);
      expect(definition.evaluate({}).groups).toBe(false);
    });
    it('rejects a wrong partition and guards the exact retry boundary', () => {
      const wrong = submit(select(items));
      expect(wrong.feedback).toEqual({ groups: false });
      expect(wrong.retryAt).toBe(1000 + definition.cooldownMs);
      expect(score([definition], { [definition.id]: wrong })).toBe(0);
      expect(submit(wrong, wrong.retryAt - 1)).toBe(wrong);
      const cleared = transition(definition, wrong, { type: 'reset', now: 1001 });
      expect(cleared.interaction).toEqual({ kind: 'grouping', selected: [] });
      expect(cleared.retryAt).toBe(wrong.retryAt); expect(cleared.feedback).toEqual(wrong.feedback);
      expect(transition(definition, cleared, { type: 'select', item: items[0], now: wrong.retryAt - 1 })).toBe(cleared);
      const fixed = select(groups.flat(), wrong.retryAt, cleared);
      expect(submit(fixed, wrong.retryAt).solvedAt).toBe(wrong.retryAt);
    });
    it('retains selection and deadline through router storage and tick events', () => {
      const wrong = submit(select(items));
      const routerAttempts = { [definition.id]: wrong };
      const returned = routerAttempts[definition.id];
      expect(transition(definition, returned, { type: 'tick', now: 1001 })).toBe(wrong);
      expect(submit(returned, 1001)).toBe(wrong);
      expect(returned.interaction).toEqual({ kind: 'grouping', selected: items });
    });
    it('resets only local selections after solving and never permits another award', () => {
      const solved = submit(select(groups.flat()));
      const cleared = transition(definition, solved, { type: 'reset', now: 1001 });
      expect(cleared.solvedAt).toBe(solved.solvedAt); expect(cleared.retryAt).toBe(0);
      expect(cleared.feedback).toEqual(solved.feedback);
      expect(score([definition], { [definition.id]: cleared })).toBe(definition.points);
      expect(submit(cleared)).toBe(cleared);
      expect(transition(definition, cleared, { type: 'select', item: items[0], now: 1001 })).toBe(cleared);
    });
    it('rejects malformed partitions and preserves fixed groups of three', () => {
      const correct = groups.flat();
      for (const order of [correct.slice(1), [...correct, items[0]], correct.map((item, index) => index === 0 ? 'unknown' : item), correct.map((item, index) => index === 0 ? correct[1] : item)]) {
        expect(definition.evaluate({ groups: order.join(',') }).groups).toBe(false);
      }
      expect(select(correct.slice(0, 3)).interaction).toEqual({ kind: 'grouping', selected: correct.slice(0, 3) });
    });
  });
}
