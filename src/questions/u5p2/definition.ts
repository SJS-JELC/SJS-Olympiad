import type { QuestionDefinition } from '../attempts';
import type { DotCrossState } from '../../components/dot-cross/contracts';
import { validateState } from '../../components/dot-cross/core.js';
function matchesContributor(value: string | undefined, contributor: number): boolean {
 try {
  const s = JSON.parse(value ?? '') as DotCrossState;
  if (validateState(s).length || s.kind !== 'dot-and-cross' || s.atoms.length !== 3 || s.electrons.length !== 16 || s.groups.length) return false;
  const ns = s.atoms.filter(a => a.element === 'N'), os = s.atoms.filter(a => a.element === 'O');
  if(ns.length !== 2 || os.length !== 1) return false;
  return ns.some(center => {
   const terminal = ns.find(n => n.id !== center.id)!;
   const regions = [terminal.id, center.id, os[0].id];
   const counts = Array.from({length:5},()=>[0,0]);
   for(const e of s.electrons) {
    if(e.symbol !== 'dot' && e.symbol !== 'cross') return false;
    const a=e.anchor;
    let region=-1;
    if(a.kind==='atom') region=regions.indexOf(a.atomId);
    else {
     const pair=[a.a,a.b];
     if(pair.includes(center.id) && pair.includes(terminal.id)) region=3;
     if(pair.includes(center.id) && pair.includes(os[0].id)) region=4;
    }
    if(region<0) return false;
    counts[region][e.symbol==='dot'?0:1]++;
   }
   const keys=[[[2,0],[0,0],[6,0],[3,3],[0,2]],[[4,0],[0,0],[4,0],[1,3],[2,2]]];
   return [keys[contributor]].some(key=>[false,true].some(flip=>counts.every((c,i)=>c[0]===key[i][flip?1:0] && c[1]===key[i][flip?0:1])));
  });
 } catch { return false; }
}
export function markDiagram(value: string | undefined): boolean {
 try {
  const s=JSON.parse(value ?? '') as DotCrossState;
  if(validateState(s).length || s.kind!=='dot-and-cross' || s.atoms.length!==6 || s.electrons.length!==32 || s.groups.length) return false;
  const neighbours=new Map(s.atoms.map(a=>[a.id,new Set<string>()]));
  for(const e of s.electrons) if(e.anchor.kind==='bond') {
   neighbours.get(e.anchor.a)!.add(e.anchor.b);
   neighbours.get(e.anchor.b)!.add(e.anchor.a);
  }
  const unseen=new Set(neighbours.keys()), components:Set<string>[]=[];
  while(unseen.size) {
   const ids=new Set<string>(), pending=[unseen.values().next().value!];
   while(pending.length) {
    const id=pending.pop()!;
    if(ids.has(id)) continue;
    ids.add(id); unseen.delete(id);
    pending.push(...neighbours.get(id)!);
   }
   components.push(ids);
  }
  if(components.length!==2 || components.some(c=>c.size!==3)) return false;
  const diagrams=components.map(ids=>JSON.stringify({
   kind:'dot-and-cross', groups:[],
   atoms:s.atoms.filter(a=>ids.has(a.id)),
   electrons:s.electrons.filter(e=>ids.has(e.anchor.kind==='atom'?e.anchor.atomId:e.anchor.a))
  }));
  return (matchesContributor(diagrams[0],0) && matchesContributor(diagrams[1],1))
    || (matchesContributor(diagrams[0],1) && matchesContributor(diagrams[1],0));
 } catch { return false; }
}
export const u5p2: QuestionDefinition = {
 id:'U5P2',year:'U5',number:2,title:'Cross Your Fingers',points:1,cooldownMs:20000,
 lockCorrectParts:false,allowIncompleteSubmission:true,
 parts:[{id:'diagram',label:'N₂O diagram',fields:[{id:'diagram',label:'N₂O diagram'}]}],
 evaluate: answers=>({diagram:markDiagram(answers.diagram)})
};
