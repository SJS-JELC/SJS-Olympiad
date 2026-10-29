import {it,expect} from 'vitest';
import {atoms,bonds,rotate} from '../../src/questions/u5p6/cubaneGeometry';
it('uses exact stated bond lengths and invariant rotations',()=>{
 expect(atoms).toHaveLength(16);expect(bonds).toHaveLength(20);
 for(const [a,b] of bonds) {
  const distance=(p:readonly number[],q:readonly number[])=>Math.hypot(...p.map((v,i)=>v-q[i]));
  const length=atoms[a].element===atoms[b].element?154:109;
  expect(distance(atoms[a].position,atoms[b].position)).toBeCloseTo(length,10);
  expect(distance(rotate(atoms[a].position,1.5,-0.8),rotate(atoms[b].position,1.5,-0.8))).toBeCloseTo(length,10);
 }
});
