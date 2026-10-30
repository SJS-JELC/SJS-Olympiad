import type { Bond, Graph } from '../../src/questions/u5p7/model';
import type { MoleculeAtom, MoleculeState } from '../../src/contracts/molecule';
// Independent regression drawings transcribed from the approved Cut and Shut mark scheme.
const chain: Bond[] = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[2,7],[7,8]].map(([a,b])=>({a,b,order:1}));
export const solutions: Graph[] = [[0,7,5],[7,0,5],[5,0,7]].map(([terminal,a,b])=>({
  atoms:Array.from({length:10},(_,id)=>({id,x:id*30,y:100})),
  bonds:[...chain,{a:9,b:terminal,order:2},{a,b,order:2}],
}));

/** Independent answer drawings; no runtime/private marker is imported here. */
export function moleculeDrawing(explicitHydrogens = false, source = solutions): MoleculeState {
  const atoms: MoleculeAtom[] = [], bonds: {a:number;b:number;order:1|2|3}[] = [];
  source.forEach((g, index) => {
    const ids = new Map(g.atoms.map((a, i) => [a.id, index * 100 + i]));
    atoms.push(...g.atoms.map(a => ({...a,id:ids.get(a.id)!,element:'C' as const,x:a.x+index*500})));
    bonds.push(...g.bonds.map(b => ({...b,a:ids.get(b.a)!,b:ids.get(b.b)!})));
    if (!explicitHydrogens) return;
    g.atoms.forEach(a => {
      const h = 4 - g.bonds.filter(b => b.a===a.id || b.b===a.id).reduce((n,b)=>n+b.order,0);
      for(let i=0;i<h;i++) {
        const id = index*100+20+atoms.filter(v=>v.element==='H'&&v.id>=index*100&&v.id<(index+1)*100).length;
        atoms.push({id,element:'H',x:a.x+index*500+i*15,y:a.y+50});
        bonds.push({a:ids.get(a.id)!,b:id,order:1});
      }
    });
  });
  return {kind:'molecule',graph:{atoms,bonds},history:[]};
}
