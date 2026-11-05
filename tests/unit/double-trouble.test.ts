import { describe, expect, it } from 'vitest';
import { doubleTrouble } from '../../src/questions/double-trouble/definition';
import {doubleTroubleItems} from '../fixtures/grouping-presentations';
import { doubleTroubleGroups } from '../fixtures/double-trouble';

describe('Double Trouble chemistry', () => {
  it('independently derives zero, one and two DBE for the approved formulae', () => {
    doubleTroubleGroups.forEach((group, dbe) => {
      for (const formula of group) {
        const atoms = Object.fromEntries([...formula.matchAll(/([CHNO])(\d*)/g)].map(([,atom,count]) => [atom, Number(count || 1)]));
        expect((2 * atoms.C + 2 + (atoms.N ?? 0) - atoms.H) / 2).toBe(dbe);
      }
    });
    expect(new Set(doubleTroubleItems)).toEqual(new Set(doubleTroubleGroups.flat()));
    expect(doubleTrouble.points).toBe(2);
    expect(doubleTrouble.cooldownMs).toBe(20000);
  });
  it('does not present a solved row or column', () => {
    const groupOf = (item: string) => doubleTroubleGroups.findIndex(group => (group as readonly string[]).includes(item));
    for (let i=0;i<3;i++) {
      expect(new Set(doubleTroubleItems.slice(i*3,i*3+3).map(groupOf)).size).toBeGreaterThan(1);
      expect(new Set([0,1,2].map(row=>groupOf(doubleTroubleItems[row*3+i]))).size).toBeGreaterThan(1);
    }
  });
});
