import type {GcPresentation} from './presentation';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { Composition } from './types';


export function FormulationBar({ units, disabled, onChange,content }: {content:GcPresentation; units: Composition; disabled: boolean; onChange: (units: Composition) => void }) {
  const total=units.reduce((sum,value)=>sum+value,0), lastDivider=units.length-2;
  const percent=(value:number)=>(value/content.unitsPerPercent).toFixed(1)+'%';
  const bar = useRef<HTMLDivElement>(null);
  const divisions = units.slice(0,-1).map((_,index)=>units.slice(0,index+1).reduce((sum,value)=>sum+value,0));
  const move = (index: number, target: number) => {
    if (disabled) return;
    const next = [...divisions];
    next[index] = Math.max(index === 0 ? 0 : divisions[index - 1], Math.min(index === lastDivider ? total : divisions[index + 1], Math.round(target)));
    onChange([...next,total].map((value,i)=>value-(next[i-1]??0)));
  };
  const pointer = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || !bar.current) return;
    const bounds = bar.current.getBoundingClientRect();
    move(index, (event.clientX - bounds.left) / bounds.width * total);
  };
  const keyboard = (index: number, event: KeyboardEvent<HTMLButtonElement>) => {
    let target = divisions[index];
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') target -= step;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') target += step;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = total;
    else return;
    event.preventDefault(); move(index, target);
  };
  return <fieldset className="gc-formulation" disabled={disabled}>
    <legend className="gc-formulation-title type-label">{content.words.blend}</legend>
    <div className="gc-mixture-labels">{content.names.map((name, i) => <div key={name} className="type-label"><span className={'gc-swatch gc-swatch--' + i} style={{background:content.formulationColours[i]}} />{name} <strong className="text-tabular">{percent(units[i])}</strong></div>)}</div>
    <div className="gc-mixture-bar" ref={bar} aria-label={content.words.formulationLabel}>
      {units.map((value, i) => <span key={i} className={'gc-mixture-segment gc-mixture-segment--' + i} style={{ width: value / total * 100 + '%', background:content.formulationColours[i] }} />)}
      {divisions.map((value, i) => <button key={i} type="button" role="slider" className="gc-mixture-divider" style={{ left: value / total * 100 + '%' }} disabled={disabled}
        aria-label={content.names[i] + ' / ' + content.names[i + 1] + content.words.boundary} aria-valuemin={(i === 0 ? 0 : divisions[i - 1]) / content.unitsPerPercent} aria-valuemax={(i === lastDivider ? total : divisions[i + 1]) / content.unitsPerPercent} aria-valuenow={value / content.unitsPerPercent} aria-valuetext={percent(value) + ' from left'}
        onKeyDown={event => keyboard(i, event)}
        onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pointer(i, event); }}
        onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pointer(i, event); }}
        onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) { pointer(i, event); event.currentTarget.releasePointerCapture(event.pointerId); } }}>
        <span aria-hidden="true">↔</span>
      </button>)}
    </div>
  </fieldset>;
}
