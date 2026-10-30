import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseMoleculeAnswer as parsePrivateMolecule } from '../../api/src/private/molecule-validation.mjs';
import { applyMoleculeCommand, assertMoleculeState, blankMolecule, core, moleculeEngine } from '../../src/chemistry/molecule/engine';
import { applyTarget, destination, gestureGraph, LENGTH } from '../../src/chemistry/molecule/interaction';
import { displayedGraph, labelFor } from '../../src/chemistry/molecule/depiction';
import { cameraViewBox, drawingScaleForHeight, fitMoleculeCamera, panMoleculeCamera, zoomMoleculeCamera } from '../../src/components/molecule/camera';

describe('reusable molecular drawing semantics', () => {
  it('commits a whole chain gesture once, preserves the input, and undoes it', () => {
    const initial = blankMolecule();
    const graph = gestureGraph(initial.graph, {target:null,start:{x:0,y:0}}, {x:220,y:0}, 'C', 1, true);
    const next = moleculeEngine.apply(initial, {kind:'commit-graph',graph});
    expect(next.graph.atoms.length).toBeGreaterThan(2);
    expect(next.history).toHaveLength(1);
    expect(initial.graph.atoms).toHaveLength(0);
    expect(moleculeEngine.apply(next, {kind:'undo'})).toEqual(initial);
  });

  it('cycles bond order and snaps an existing endpoint without duplicating atoms', () => {
    let graph = core.addAtom(core.empty(), 'C', 0, 0);
    graph = core.addAtom(graph, 'C', LENGTH, 0, 1);
    const target = {kind:'bond' as const,a:1,b:2};
    graph = applyTarget(graph,target,{x:0,y:0},'C',false);
    expect(graph.bonds[0].order).toBe(2);
    expect(destination(graph,graph.atoms[0],{x:LENGTH+2,y:1}).id).toBe(2);
    expect(gestureGraph(graph,{target:{kind:'atom',id:1},start:graph.atoms[0]},graph.atoms[1],'C',1,false)).toEqual(graph);
    graph = applyTarget(graph,target,{x:0,y:0},'C',false);
    expect(graph.bonds[0].order).toBe(3);
    expect(applyTarget(graph,target,{x:0,y:0},'C',false).bonds[0].order).toBe(1);
  });

  it('keeps disconnected graphs and assessable valence mistakes, rejects malformed references', () => {
    let graph = core.addAtom(core.empty(),'C',0,0);
    graph = core.addAtom(graph,'F',150,0);
    const state = {...blankMolecule(),graph};
    expect(assertMoleculeState(state)).toBe(state);
    expect(core.validate(graph,true).kind).toBe('valid');
    expect(moleculeEngine.checkSubmission(state).status).toBe('ready');
    const invalid = {...state,graph:{...graph,bonds:[{a:1,b:2,order:3 as const}]}};
    expect(moleculeEngine.validate(invalid).valid).toBe(true);
    expect(moleculeEngine.checkSubmission(invalid)).toMatchObject({status:'ready',chemicalIssues:[{code:'valence'}]});
    expect(moleculeEngine.checkSubmission({...state,graph:{...graph,bonds:[{a:1,b:999,order:1}]}}).status).toBe('malformed');
  });

  it('expands only implicit hydrogens in displayed view without changing semantic data', () => {
    let graph = core.addAtom(core.empty(),'C',0,0);
    graph = core.addAtom(graph,'C',LENGTH,0,1,2);
    graph = core.addAtom(graph,'F',0,-LENGTH,1);
    graph = core.addAtom(graph,'H',LENGTH,-LENGTH,2);
    const before = structuredClone(graph), drawing = displayedGraph(graph);
    expect(graph).toEqual(before);
    expect(drawing.atoms.filter(a=>a.id<0)).toHaveLength(2);
    expect(drawing.atoms.filter(a=>a.element==='H')).toHaveLength(3);
    expect(drawing.bonds).toHaveLength(graph.bonds.length+2);
    const label = labelFor(graph.atoms[0],drawing,'displayed',text=>text.length*10);
    expect(label?.chunks.map(c=>c.text).join('')).toBe('C');
  });

  it('bounds undo history and clear remains undoable', () => {
    let state = moleculeEngine.apply(blankMolecule(), {kind:'add',element:'C',point:{x:0,y:0},order:1});
    for(let x=1;x<=120;x++) state=moleculeEngine.apply(state,{kind:'move',id:1,point:{x,y:0}});
    expect(state.history).toHaveLength(100);
    const cleared = moleculeEngine.apply(state,{kind:'clear'});
    expect(cleared.graph.atoms).toHaveLength(0);
    expect(moleculeEngine.apply(cleared,{kind:'undo'}).graph).toEqual(state.graph);
  });

  it('cleans fully explicit alkene monomers to trigonal planar geometry without inserting atoms', () => {
    let graph=core.addAtom(core.empty(),'H',10,10);
    graph=core.addAtom(graph,'C',0,0,1);
    graph=core.addAtom(graph,'C',20,20,2,2);
    graph=core.addAtom(graph,'Cl',30,30,2);
    graph=core.addAtom(graph,'F',40,40,3);
    graph=core.addAtom(graph,'H',50,50,3);
    const initial={...blankMolecule(),graph};
    const cleaned=moleculeEngine.apply(initial,{kind:'clean'});
    expect(cleaned.graph.bonds).toEqual(graph.bonds);
    expect(cleaned.graph.atoms.map(({x:_,y:__,...a})=>a)).toEqual(graph.atoms.map(({x:_,y:__,...a})=>a));
    for (const b of cleaned.graph.bonds) {
      const a=cleaned.graph.atoms.find(a=>a.id===b.a)!, z=cleaned.graph.atoms.find(a=>a.id===b.b)!;
      expect(Math.hypot(a.x-z.x,a.y-z.y)).toBeCloseTo(LENGTH,2);
    }
    for (const id of [2,3]) {
      const a=cleaned.graph.atoms.find(a=>a.id===id)!;
      const vectors=core.neighbours(cleaned.graph,id).map(e=>{
        const b=cleaned.graph.atoms.find(a=>a.id===e.id)!;
        return {x:b.x-a.x,y:b.y-a.y};
      });
      for(let i=0;i<3;i++) for(let j=i+1;j<3;j++)
        expect((vectors[i].x*vectors[j].x+vectors[i].y*vectors[j].y)/(LENGTH*LENGTH)).toBeCloseTo(-.5,4);
    }
    expect(moleculeEngine.apply(cleaned,{kind:'undo'})).toEqual(initial);
    // Incomplete drawings remain incomplete; implicit H stays a marking convention.
    const partial={...blankMolecule(),graph:core.addAtom(core.empty(),'C',0,0)};
    expect(moleculeEngine.apply(partial,{kind:'clean'}).graph.atoms).toHaveLength(1);
  });

  it('spaces disconnected explicit monomers apart without changing their components',()=>{
    let graph=core.empty();
    for(let i=0;i<4;i++) {
      graph=core.addAtom(graph,'C',i,0);
      graph=core.addAtom(graph,'C',i+1,1,graph.atoms.at(-1)!.id,2);
      graph=core.addAtom(graph,'H',i+2,2,graph.atoms.at(-1)!.id);
    }
    const cleaned=moleculeEngine.apply({...blankMolecule(),graph},{kind:'clean'}).graph;
    expect(cleaned.atoms).toHaveLength(graph.atoms.length);
    expect(cleaned.bonds).toEqual(graph.bonds);
    const bounds=[0,1,2,3].map(i=>cleaned.atoms.slice(i*3,i*3+3).map(a=>a.x));
    for(let i=1;i<4;i++) expect(Math.min(...bounds[i])-Math.max(...bounds[i-1])).toBeCloseTo(LENGTH*2,2);
  });

  it('camera operations do not change molecular coordinates and clamp zoom', () => {
    const graph=core.addAtom(core.empty(),'C',100,50), before=structuredClone(graph);
    const camera=fitMoleculeCamera(graph,600,250);
    expect(camera).toMatchObject({x:100,y:50});
    expect(cameraViewBox(camera,600,250).h).toBeCloseTo(250/camera.scale);
    expect(zoomMoleculeCamera(camera,100).scale).toBe(4);
    expect(zoomMoleculeCamera(camera,.001).scale).toBe(.15);
    expect(panMoleculeCamera(camera,14,0).x).toBeCloseTo(90);
    expect(graph).toEqual(before);
  });
});


describe('per-question molecular limits', () => {
  const limits = {maxHeavyAtoms:40,maxAtoms:100,maxBonds:150};
  it('keeps Chainspotting defaults and passes larger limits through gestures, assertions, cleanup and undo', () => {
    const gesture = {target:null,start:{x:0,y:0}};
    const small = gestureGraph(core.empty(),gesture,{x:4000,y:0},'C',1,true);
    const large = gestureGraph(core.empty(),gesture,{x:4000,y:0},'C',1,true,1,limits);
    expect(small.atoms).toHaveLength(20);
    const connectedAtCap = gestureGraph(large,{target:{kind:'atom',id:large.atoms[0].id},start:large.atoms[0]},large.atoms[2],'C',1,false,1,limits);
    expect(connectedAtCap.bonds).toHaveLength(large.bonds.length+1);
    expect(connectedAtCap.atoms).toHaveLength(40);
    expect(large.atoms).toHaveLength(40);
    const state = {...blankMolecule(),graph:large};
    expect(() => assertMoleculeState(state)).toThrow();
    expect(assertMoleculeState(state,limits)).toBe(state);
    const cleaned = applyMoleculeCommand(state,{kind:'clean'},limits);
    expect(cleaned.graph.atoms).toHaveLength(40);
    expect(cleaned.graph.bonds).toEqual(large.bonds);
    expect(applyMoleculeCommand(cleaned,{kind:'undo'},limits)).toEqual(state);
    expect(applyTarget(large,null,{x:5000,y:0},'C',false,limits)).toBe(large);
    const withH = applyTarget(large,null,{x:5000,y:0},'H',false,limits);
    expect(withH.atoms).toHaveLength(41);
    expect(core.setElement(withH,withH.atoms.at(-1)!.id,'C',limits)).toBe(withH);
    expect(core.validate(large,true,limits).kind).toBe('valid');
    expect(core.validate(withH,true,limits).kind).toBe('valence');
  });
  it('bounds total atoms and bonds as well as heavy atoms without inserting anything', () => {
    const limits = {maxHeavyAtoms:3,maxAtoms:4,maxBonds:2};
    let graph = core.addAtom(core.empty(),'C',0,0,null,1,limits);
    graph = core.addAtom(graph,'H',74,0,1,1,limits);
    graph = core.addAtom(graph,'H',-74,0,1,1,limits);
    expect(core.addAtom(graph,'H',0,74,1,1,limits)).toBe(graph);
    graph = core.addAtom(graph,'H',0,74,null,1,limits);
    expect(core.addAtom(graph,'H',0,-74,null,1,limits)).toBe(graph);
    expect(core.addBond(graph,1,4,1,limits)).toBe(graph);
    expect(() => core.assertGraph({...graph,bonds:[...graph.bonds,{a:1,b:4,order:1}]},limits)).toThrow();
  });
  it('scales initial drawing glyphs by viewport height and retains world geometry', () => {
    expect(drawingScaleForHeight(1440)/drawingScaleForHeight(1080)).toBeCloseTo(4/3);
    expect(drawingScaleForHeight(640)).toBeGreaterThan(1);
  });
});


it('keeps public/private generic core bytes identical and private parser limits scoped to each question', () => {
  const publicCore=readFileSync(new URL('../../src/chemistry/molecule/core.js',import.meta.url));
  const privateCore=readFileSync(new URL('../../api/src/private/molecule-core.mjs',import.meta.url));
  expect(privateCore.equals(publicCore)).toBe(true);
  const graph={atoms:Array.from({length:21},(_,i)=>({id:i,element:'C',x:i*74,y:0})),bonds:[]};
  const value=JSON.stringify({...blankMolecule(),graph});
  expect(parsePrivateMolecule(value)).toBeNull();
  expect(parsePrivateMolecule(value,{maxHeavyAtoms:40,maxAtoms:100,maxBonds:150})).toMatchObject({graph});
});
