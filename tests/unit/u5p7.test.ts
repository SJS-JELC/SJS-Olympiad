import {it,expect} from 'vitest';
import {solutions,correct,equivalent} from '../../src/questions/u5p7/model';
it('requires all three distinct structures',()=>{expect(correct(JSON.stringify({graphs:solutions}))).toBe(true);expect(correct(JSON.stringify({graphs:[solutions[0],solutions[0],solutions[1]]}))).toBe(false);expect(correct('')).toBe(false);});
it('ignores coordinates, numbering and ordering',()=>{for(const g of solutions){const changed={atoms:g.atoms.map(a=>({...a,id:a.id+20,x:200-a.x})).reverse(),bonds:g.bonds.map(b=>({...b,a:b.b+20,b:b.a+20})).reverse()};expect(equivalent(g,changed)).toBe(true);}});
it('rejects altered connectivity',()=>{const g=structuredClone(solutions[0]);g.bonds[0].b=6;expect(equivalent(g,solutions[0])).toBe(false);});
