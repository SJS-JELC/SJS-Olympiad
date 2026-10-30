import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { solutions, moleculeDrawing } from '../fixtures/u5p7';
import { correct, equivalent } from '../../api/src/private/frameworks.mjs';
import { validateAnswers, reduceQuestion } from '../../api/src/questions.mjs';
import { compactAnswers } from '../../src/cloud/CloudQuestion';
import { parseP7Drawing, readP7Drawing, serializeP7Drawing, p7Limits } from '../../src/questions/u5p7/model';
import { applyMoleculeCommand, assertMoleculeState } from '../../src/chemistry/molecule/engine';

describe('Cut and Shut keeps the approved three hydrocarbon connectivities', () => {
  it('requires all three distinct legacy structures, with no extra nonblank candidate', () => {
    expect(correct(JSON.stringify({graphs:solutions}))).toBe(true);
    expect(correct(JSON.stringify({graphs:[solutions[0],solutions[0],solutions[1]]}))).toBe(false);
    expect(correct(JSON.stringify({graphs:[...solutions,{atoms:[],bonds:[]}]}))).toBe(true);
    expect(correct(JSON.stringify({graphs:[...solutions,solutions[0]]}))).toBe(false);
    expect(correct('')).toBe(false);
  });
  it('ignores coordinates, numbering and ordering without changing connectivity', () => {
    for(const g of solutions) {
      const changed={atoms:g.atoms.map(a=>({...a,id:a.id+20,x:200-a.x})).reverse(),bonds:g.bonds.map(b=>({...b,a:b.b+20,b:b.a+20})).reverse()};
      expect(equivalent(g,changed)).toBe(true);
    }
    const state=moleculeDrawing();
    const changed={...state,graph:{atoms:state.graph.atoms.map(a=>({...a,id:a.id*7+120,x:-a.y,y:a.x})).reverse(),bonds:state.graph.bonds.map(b=>({...b,a:b.b*7+120,b:b.a*7+120})).reverse()}};
    expect(correct(JSON.stringify(changed))).toBe(true);
    const wrong=structuredClone(solutions[0]); wrong.bonds[0].b=6;
    expect(equivalent(wrong,solutions[0])).toBe(false);
  });
  it('accepts implicit, explicit, specified and mixed hydrogens on one shared canvas', () => {
    expect(correct(serializeP7Drawing(moleculeDrawing()))).toBe(true);
    const explicit=moleculeDrawing(true);
    expect(explicit.graph.atoms).toHaveLength(78);
    expect(correct(serializeP7Drawing(explicit))).toBe(true);
    const removed=new Set(explicit.graph.atoms.filter(a=>a.element==='H'&&a.id%2===0).map(a=>a.id));
    const mixed={...explicit,graph:{atoms:explicit.graph.atoms.filter(a=>!removed.has(a.id)),bonds:explicit.graph.bonds.filter(b=>!removed.has(b.a)&&!removed.has(b.b))}};
    expect(correct(serializeP7Drawing(mixed))).toBe(true);
    const specified=moleculeDrawing();
    const graph={...specified.graph,atoms:specified.graph.atoms.map(a=>({...a,h:(4-specified.graph.bonds.filter(b=>b.a===a.id||b.b===a.id).reduce((n,b)=>n+b.order,0)) as 0|1|2|3|4}))};
    expect(correct(serializeP7Drawing({...specified,graph}))).toBe(true);
  });
  it('rejects duplicates, missing/extra components, oxygen, charge, broken references and valence errors', () => {
    expect(correct(serializeP7Drawing(moleculeDrawing(false,[solutions[0],solutions[0],solutions[1]])))).toBe(false);
    expect(correct(serializeP7Drawing(moleculeDrawing(false,solutions.slice(1))))).toBe(false);
    const source=moleculeDrawing();
    for(const atom of [{id:999,element:'C',x:0,y:0},{id:999,element:'O',x:0,y:0},{id:999,element:'H',x:0,y:0}])
      expect(correct(JSON.stringify({...source,graph:{...source.graph,atoms:[...source.graph.atoms,atom]}}))).toBe(false);
    for(const changed of [
      {...source.graph,atoms:source.graph.atoms.map((a,i)=>i===0?{...a,element:'O'}:a)},
      {...source.graph,atoms:source.graph.atoms.map((a,i)=>i===0?{...a,charge:1}:a)},
      {...source.graph,bonds:[...source.graph.bonds,{a:0,b:999,order:1}]},
      {...source.graph,bonds:[...source.graph.bonds,{a:0,b:7,order:3}]},
      {...source.graph,bonds:source.graph.bonds.map((b,i)=>i===0?{...b,order:2}:b)},
    ]) expect(correct(JSON.stringify({...source,graph:changed}))).toBe(false);
    for(const value of ['','null','{}','{',JSON.stringify({...source,history:[source.graph]})]) expect(correct(value)).toBe(false);
  });
});

describe('P7 shared editor, compatibility and compact persistence', () => {
  it('losslessly flattens legacy slots with unique IDs and separated positions, without touching the input', () => {
    const legacy={graphs:[solutions[0],{atoms:[],bonds:[]},solutions[1],solutions[2]],selected:3};
    const before=JSON.stringify(legacy), parsed=parseP7Drawing(before);
    expect(parsed?.kind).toBe('editable');
    if(parsed?.kind!=='editable') throw Error('Expected an editable conversion');
    expect(new Set(parsed.state.graph.atoms.map(a=>a.id)).size).toBe(30);
    expect(parsed.state.graph.atoms).toHaveLength(30);
    expect(parsed.state.graph.bonds).toHaveLength(30);
    expect(correct(serializeP7Drawing(parsed.state))).toBe(true);
    expect(parsed.state.graph.atoms[10].x).toBeGreaterThan(Math.max(...parsed.state.graph.atoms.slice(0,10).map(a=>a.x)));
    expect(JSON.stringify(legacy)).toBe(before);
  });
  it('does not reinterpret unsupported legacy atom chemistry as carbon', () => {
    for(const fields of [{element:'O'}, {element:'C'}, {charge:1}, {h:0}, {pairs:[0]}]) {
      const legacy={graphs:structuredClone(solutions),selected:0};
      Object.assign(legacy.graphs[0].atoms[0],fields);
      const raw=JSON.stringify(legacy);
      expect(parseP7Drawing(raw)).toBeNull();
      expect(correct(raw)).toBe(false);
    }
  });
  it('retains an oversized valid legacy draft for read-only display without truncation', () => {
    const legacy={graphs:Array.from({length:5},()=>structuredClone(solutions[0])),selected:4};
    const raw=JSON.stringify(legacy), parsed=readP7Drawing(raw);
    expect(parsed.kind).toBe('legacy-readonly');
    if(parsed.kind!=='legacy-readonly') throw Error('Expected a retained legacy drawing');
    expect(parsed.drawing).toEqual(legacy);
    expect(JSON.stringify(parsed.drawing)).toBe(raw);
    expect(parseP7Drawing('not JSON')).toBeNull();
  });
  it('allows all 30 carbons/78 explicit atoms, and clean/undo retain every atom and bond', () => {
    const state=moleculeDrawing(true);
    expect(()=>assertMoleculeState(state)).toThrow(); // P3 keeps its existing 20-heavy-atom bound.
    expect(assertMoleculeState(state,p7Limits)).toBe(state);
    const cleaned=applyMoleculeCommand(state,{kind:'clean'},p7Limits);
    expect(cleaned.graph.atoms.map(({x:_,y:__,...a})=>a)).toEqual(state.graph.atoms.map(({x:_,y:__,...a})=>a));
    expect(cleaned.graph.bonds).toEqual(state.graph.bonds);
    expect(applyMoleculeCommand(cleaned,{kind:'undo'},p7Limits)).toEqual(state);
    expect(correct(serializeP7Drawing({...cleaned,history:[]}))).toBe(true);
  });
  it('strips plural-field undo locally and at the server boundary, keeping the semantic snapshot below 24KB', () => {
    const state=moleculeDrawing(true), withHistory={...state,history:[state.graph,state.graph]};
    const input={drawings:serializeP7Drawing(withHistory),history:'old local history'};
    const compact=compactAnswers(input), server=validateAnswers('U5P7',input);
    expect(JSON.parse(compact.drawings).history).toEqual([]);
    expect(server).toEqual(compact);
    expect(JSON.parse(input.drawings).history).toHaveLength(2);
    expect(Buffer.byteLength(JSON.stringify(compact))).toBeLessThan(24000);
    expect(correct(server.drawings)).toBe(true);
  });
  it('restores a complete explicit-H drawing with a full local undo stack beyond the network budget', () => {
    const state=moleculeDrawing(true), withHistory={...state,history:Array.from({length:100},()=>structuredClone(state.graph))};
    const raw=serializeP7Drawing(withHistory);
    expect(raw.length).toBeGreaterThan(100000);
    const parsed=readP7Drawing(raw);
    expect(parsed.kind).toBe('editable');
    if(parsed.kind!=='editable') throw Error('Expected the whole local drawing and undo stack');
    expect(parsed.state.graph.atoms).toHaveLength(78);
    expect(parsed.state.history).toHaveLength(100);
    const compact=compactAnswers({drawings:raw});
    expect(Buffer.byteLength(JSON.stringify(compact))).toBeLessThan(24000);
    expect(correct(validateAnswers('U5P7',compact).drawings)).toBe(true);
  });
  it('preserves the twenty-second server cooldown and awards two points once', () => {
    const wrong=reduceQuestion('U5P7',null,{type:'submit',answers:{}},1000)!;
    expect(wrong.state.retryAt).toBe(21000); expect(wrong.award).toBe(false);
    const answers={drawings:serializeP7Drawing(moleculeDrawing())};
    expect(reduceQuestion('U5P7',wrong,{type:'submit',answers},20999)!.award).toBe(false);
    const right=reduceQuestion('U5P7',wrong,{type:'submit',answers},21000)!;
    expect(right.award).toBe(true); expect(right.state.solvedAt).toBe(21000);
    expect(reduceQuestion('U5P7',right,{type:'submit',answers},22000)!.award).toBe(false);
  });
  it('records the unchanged products and hashes of generated RDKit geometry/labels', () => {
    const base=new URL('../../src/questions/u5p7/assets/',import.meta.url);
    const provenance=JSON.parse(readFileSync(new URL('ozonolysis-products.provenance.json',base),'utf8'));
    expect(provenance.rdkitVersion).toBe('2025.09.1');
    expect(provenance.products.map((p:{formula:string})=>p.formula)).toEqual(['CH2O','C9H14O3']);
    for(const [file,key] of [['ozonolysis-products.svg','geometrySha256'],['ozonolysis-products.labels.json','labelsSha256']])
      expect(createHash('sha256').update(readFileSync(new URL(file,base))).digest('hex')).toBe(provenance[key]);
    const labels=JSON.parse(readFileSync(new URL('ozonolysis-products.labels.json',base),'utf8')).labels;
    expect(labels.filter((a:{text:string})=>a.text==='C')).toHaveLength(10);
    expect(labels.filter((a:{text:string})=>a.text==='H')).toHaveLength(16);
    expect(labels.filter((a:{text:string})=>a.text==='O')).toHaveLength(4);
  });
});
