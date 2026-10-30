import {describe,it,expect} from 'vitest';
import {u5p2} from '../../src/questions/u5p2/definition';
import {markDiagram} from '../../api/src/private/u5p2.mjs';
import {emptyAttempt,transition,score} from './server-markers';
import {fixture,pair} from '../fixtures/u5p2';
describe('N2O',()=>{
 for(const double of [false,true])for(const flip of [false,true])it('accepts contributor and symbol inversion '+double+flip,()=>expect(markDiagram(JSON.stringify(pair(double,!double,flip)))).toBe(true));
 it('requires one of each disconnected contributor',()=>{
 for(const s of [fixture(),pair(false,false),pair(true,true)]) expect(markDiagram(JSON.stringify(s))).toBe(false);
 const joined=pair();joined.electrons[0].anchor={kind:'bond',a:'left',b:'left2',slot:0};
 expect(markDiagram(JSON.stringify(joined))).toBe(false);
 });
 it('ignores coordinate and array ordering',()=>{const s=pair();s.atoms.reverse();s.atoms.forEach(a=>{a.x=-a.x;a.y+=50});s.electrons.reverse();expect(markDiagram(JSON.stringify(s))).toBe(true)});
 it('rejects blanks, malformed, incomplete, wrong sources and connectivity',()=>{
 expect(markDiagram('')).toBe(false);expect(markDiagram('{}')).toBe(false);
 for(const change of [(s:any)=>s.electrons.pop(),(s:any)=>s.electrons[0].symbol='cross',(s:any)=>s.atoms[1].element='O',(s:any)=>s.atoms.push({id:'extra',element:'N',x:0,y:0})]){
 const s=pair();change(s);expect(markDiagram(JSON.stringify(s))).toBe(false);}
 });
 it('preserves answer through cooldown and scores once',()=>{
 let s=transition(u5p2,emptyAttempt(),{type:'submit',now:100});
 const edit={type:'edit' as const,field:'diagram',value:JSON.stringify(pair()),now:20099};
 expect(transition(u5p2,s,edit)).toEqual(s);
 s=transition(u5p2,s,{...edit,now:20100});s=transition(u5p2,s,{type:'submit',now:20100});
 expect(score([u5p2],{U5P2:s})).toBe(1);
 expect(transition(u5p2,s,{type:'submit',now:21000})).toEqual(s);
 });
});
