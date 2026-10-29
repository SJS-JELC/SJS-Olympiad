// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MoleculeEditor } from '../../src/components/molecule/MoleculeEditor';
import { blankMolecule } from '../../src/chemistry/molecule/engine';
import type { MoleculeState } from '../../src/contracts/molecule';

let root:Root, container:HTMLDivElement, state:MoleculeState, readOnly:boolean;
const updates=vi.fn();
function render() {
  root.render(createElement(MoleculeEditor,{value:state,readOnly,label:'Test molecular canvas',elements:['C','H','F','Cl'],representations:['displayed'],explicitHydrogensOnly:true,onChange:next=>{state=next;updates(next);render();}}));
}
const svg=()=>container.querySelector<SVGSVGElement>('.molecule-workspace')!;
const atom=(id:number)=>container.querySelector<SVGGElement>(`[data-atom="${id}"]`)!;
async function key(node:Element,key:string,extra:KeyboardEventInit={}) {
  await act(async()=>{node.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra}));});
}
function pointer(type:string,x:number,y:number) {
  const event=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});
  Object.defineProperties(event,{isPrimary:{value:true},pointerId:{value:1}});
  return event;
}
beforeEach(async()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  updates.mockClear(); state=blankMolecule();readOnly=false;
  vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}});
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 1;});
  vi.stubGlobal('DOMPoint',class {constructor(public x:number,public y:number){} matrixTransform(){return this;}});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({measureText:(text:string)=>({width:text.length*13})} as unknown as CanvasRenderingContext2D);
  Object.defineProperties(SVGSVGElement.prototype,{
    getScreenCTM:{configurable:true,value:()=>({a:1,inverse:()=>({})})},
    setPointerCapture:{configurable:true,value:()=>{}},
    releasePointerCapture:{configurable:true,value:()=>{}},
    hasPointerCapture:{configurable:true,value:()=>false},
  });
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
  await act(async()=>render());
  vi.spyOn(svg(),'getBoundingClientRect').mockReturnValue({left:0,top:0,right:600,bottom:400,width:600,height:400,x:0,y:0,toJSON:()=>({})});
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();vi.restoreAllMocks();});

it('draws, cycles a double bond, places disconnected molecules and undoes through keyboard',async()=>{
  await key(svg(),'Enter');
  await key(atom(1),'ArrowRight');
  await key(atom(1),'Enter');
  await key(container.querySelector('[data-bond="1:2"]')!,'Enter');
  expect(state.graph.bonds[0].order).toBe(2);
  await key(svg(),'ArrowDown');await key(svg(),'ArrowDown');await key(svg(),'Enter');
  expect(state.graph.atoms).toHaveLength(3);
  expect(state.graph.atoms[2]).toMatchObject({x:0,y:148});
  expect(state.graph.bonds).toHaveLength(1);
  await key(svg(),'z',{ctrlKey:true});
  expect(state.graph.atoms).toHaveLength(2);
  expect(container.querySelector('.view-switch')).toBeNull();
});

it('shows exactly drawn atoms and restricts both palette and shortcuts',async()=>{
  await key(svg(),'Enter');
  expect(container.querySelectorAll('.atom-node')).toHaveLength(1);
  expect(container.querySelector('.implicit-hydrogen')).toBeNull();
  expect(container.querySelector('.atom-label')?.textContent).toBe('C');
  expect([...container.querySelectorAll('[data-element]')].map(node=>node.getAttribute('data-element'))).toEqual(['C','H','F','Cl']);
  expect(container.textContent).not.toContain('Hydrogens appear automatically');
  await key(svg(),'o');await key(atom(1),'Enter');
  await key(svg(),'n');await key(atom(1),'Enter');
  expect(state.graph.atoms[0].element).toBe('C');
});

for (const input of ['mouse','touch','keyboard']) it(`replaces an explicitly drawn hydrogen through ${input}, preserving its bond and undo`,async()=>{
  await key(svg(),'Enter');await key(svg(),'h');
  await key(atom(1),'ArrowRight');await key(atom(1),'Enter');
  expect(state.graph.atoms[1].element).toBe('H');
  for (const element of ['F','Cl','C']) {
    const tool=container.querySelector<HTMLButtonElement>(`[data-element="${element}"]`)!;
    await act(async()=>tool.click());
    if (input==='keyboard') await key(atom(2),'Enter');
    else await act(async()=>{
      for (const type of ['pointerdown','pointerup']) {
        const event=pointer(type,74,0);
        Object.defineProperty(event,'pointerType',{value:input});
        atom(2).dispatchEvent(event);
      }
    });
    expect(state.graph.atoms).toHaveLength(2);
    expect(state.graph.atoms[1].element).toBe(element);
    expect(state.graph.bonds).toEqual([{a:1,b:2,order:1}]);
    await key(svg(),'z',{ctrlKey:true});
    expect(state.graph.atoms[1].element).toBe('H');
  }
});

it('cancels a pending pointer gesture when readOnly becomes true and blocks all edits',async()=>{
  await act(async()=>{svg().dispatchEvent(pointer('pointerdown',40,40));svg().dispatchEvent(pointer('pointermove',120,40));});
  await act(async()=>{readOnly=true;render();});
  await act(async()=>svg().dispatchEvent(pointer('pointerup',120,40)));
  await key(svg(),'Enter');await key(svg(),'z',{ctrlKey:true});
  expect(updates).not.toHaveBeenCalled();expect(state.graph.atoms).toHaveLength(0);
  expect(container.querySelector('[data-atom]')).toBeNull();
  expect(container.querySelector('button[aria-label="Carbon"]')?.hasAttribute('disabled')).toBe(true);
});

it('activates a touch toolbar release when the browser omits its compatibility click',async()=>{
  await key(svg(),'Enter');
  const undo=container.querySelector<HTMLButtonElement>('button[aria-label="Undo"]')!;
  const event=pointer('pointerup',0,0);
  Object.defineProperty(event,'pointerType',{value:'touch'});
  await act(async()=>undo.dispatchEvent(event));
  expect(state.graph.atoms).toHaveLength(0);
  expect(updates).toHaveBeenCalledTimes(2);
});
