// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { DotCrossEditor } from '../../src/components/dot-cross/DotCrossEditor';
import { emptyDiagram } from '../../src/components/dot-cross/engine';
import type { DotCrossState } from '../../src/components/dot-cross/contracts';

it('keeps diagram coordinates/history and saves unchanged through zoom, pan, resize and readOnly view controls', async () => {
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}});
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 1;});
  Object.defineProperties(SVGSVGElement.prototype,{
    setPointerCapture:{configurable:true,value:()=>{}},
    releasePointerCapture:{configurable:true,value:()=>{}},
    hasPointerCapture:{configurable:true,value:()=>false},
  });
  let state:DotCrossState={...emptyDiagram(),atoms:[{id:'a1',element:'N',x:200,y:200},{id:'a2',element:'O',x:300,y:200}]};
  const initial=structuredClone(state), onResponse=vi.fn((next:DotCrossState)=>{state=next;render(false);});
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  const render=(readOnly:boolean)=>root.render(createElement(DotCrossEditor,{part:{kind:'dot-and-cross',initial,markingPolicyId:'igcse-dot-cross:n2o'},response:state,readOnly,onResponse}));
  const click=async(label:string)=>act(async()=>container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click());
  const key=async(key:string)=>act(async()=>container.querySelector('svg.dc-canvas')!.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true})));
  try {
    await act(async()=>render(false));
    const svg=container.querySelector('svg.dc-canvas')!, before=svg.getAttribute('viewBox');
    expect([...container.querySelectorAll('[data-element]')].map(node=>node.getAttribute('data-element'))).toEqual(['N','O']);
    await click('Zoom in');expect(svg.getAttribute('viewBox')).not.toBe(before);
    await click('Pan canvas');await key('ArrowRight');await key('Enter');
    await click('Zoom out');await click('Fit diagram');
    expect(state).toEqual(initial);expect(onResponse).not.toHaveBeenCalled();
    await act(async()=>render(true));
    await click('Zoom in');await key('ArrowDown');await key(' ');await click('Fit diagram');
    expect(state).toEqual(initial);expect(onResponse).not.toHaveBeenCalled();
    expect(container.querySelector('button[data-element="N"]')?.hasAttribute('disabled')).toBe(true);
  } finally { await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();vi.restoreAllMocks(); }
});
