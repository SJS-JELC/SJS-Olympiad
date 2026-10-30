import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { questionCatalog, findQuestion } from '../../src/questions/catalog';
import { serverDefinition, score, emptyAttempt, transition, type Answers } from './server-markers';
import {pair} from '../fixtures/u5p2';
import {solutions} from '../fixtures/u5p7';

// Reuse the existing dedicated-question fixtures for newer drawing interactions.
// These are lifecycle fixtures, not historical metadata.
const interactionFixtures: Record<string, Answers[]> = {
  U5P2: [{diagram:JSON.stringify(pair())}],
  U5P7: [{drawings:JSON.stringify({graphs:solutions})}],
};

describe('complete question registry', () => {
  it('contains nine entries per original year and the six approved U5 questions', () => {
    expect(questionCatalog).toHaveLength(33);
    expect(new Set(questionCatalog.map(e=>e.definition.id)).size).toBe(33);
    expect(new Set(questionCatalog.map(e=>e.definition.year+':'+e.definition.number)).size).toBe(33);
    for (const year of ['L5','L6','U6']) for(let number=1;number<=9;number++) {
      const entry=findQuestion(year,number); expect(entry).toBeDefined();
      expect(entry?.definition.points).toBe(number<=4?1:number<=7?2:3);
    }
    for (const [number, points] of [[2,1],[3,1],[5,2],[6,2],[7,2],[8,3]]) expect(findQuestion('U5',number)?.definition.points).toBe(points);
    for (const number of [1,4,9]) expect(findQuestion('U5',number)).toBeUndefined(); expect(findQuestion('EXAMPLE',0)).toBeUndefined();
    expect(findQuestion('U5',7)?.definition.title).toBe('Cut and Shut');
    expect(findQuestion('U5',8)?.definition.title).toBe('Boundaries');
  });
  // L6P8's private marking fixtures run in api/tests/service.test.mjs.
  for(const entry of questionCatalog.filter(e=>!['L5P9','L6P1','L6P3','U5P5'].includes(e.definition.id))) {
    const definition=serverDefinition(entry.definition);
    it(definition.id+' source fixtures award exactly once and blanks are never correct',()=>{
      let accepted = interactionFixtures[definition.id];
      if (!accepted) {
        // Independent regression cases remain separate from runtime marking.
        const metadata=JSON.parse(readFileSync(new URL('../fixtures/questions.json',import.meta.url),'utf8'))[definition.id];
        const fixtures=(metadata.fixtures.correct??metadata.fixtures.accepted).filter((v:unknown)=>typeof v==='object'&&v!==null) as Answers[];
        const single=(metadata.fixtures.accepted??[]).filter((v:unknown)=>typeof v==='string').map((value:string)=>definition.id==='L6P4' ? Object.fromEntries(value.split('/').flatMap((phases:string,orbital:number)=>[...phases].map((phase,index)=>[(orbital===0?'HOMO':'LUMO')+(index+1),phase]))) : ({[metadata.fieldId??'answer']:value}));
        accepted=[...fixtures,...single];
      }
      expect(accepted.length).toBeGreaterThan(0);
      expect(Object.values(definition.evaluate({})).every(v=>!v)).toBe(true);
      for(const answers of accepted) {
        const solved=transition(definition,{...emptyAttempt(),answers},{type:'submit',now:100});
        expect(solved.solvedAt).toBe(100);
        expect(score([definition],{[definition.id]:solved})).toBe(definition.points);
        expect(transition(definition,solved,{type:'submit',now:200})).toBe(solved);
      }
    });
  }
});
