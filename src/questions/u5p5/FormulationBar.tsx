import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { Composition } from './types';

const NAMES = ['Citrus', 'Floral', 'Woody', 'Ethanol'];
const percent = (units: number) => (units / 2).toFixed(1) + '%';
export function FormulationBar({ units, disabled, onChange }: { units: Composition; disabled: boolean; onChange: (units: Composition) => void }) {
  const bar = useRef<HTMLDivElement>(null);
  const divisions = [units[0], units[0] + units[1], units[0] + units[1] + units[2]];
  const move = (index: number, target: number) => {
    if (disabled) return;
    const next = [...divisions];
    next[index] = Math.max(index === 0 ? 0 : divisions[index - 1], Math.min(index === 2 ? 200 : divisions[index + 1], Math.round(target)));
    onChange([next[0], next[1] - next[0], next[2] - next[1], 200 - next[2]]);
  };
  const pointer = (index: number, event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || !bar.current) return;
    const bounds = bar.current.getBoundingClientRect();
    move(index, (event.clientX - bounds.left) / bounds.width * 200);
  };
  const keyboard = (index: number, event: KeyboardEvent<HTMLButtonElement>) => {
    let target = divisions[index];
    const step = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') target -= step;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') target += step;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = 200;
    else return;
    event.preventDefault(); move(index, target);
  };
  return <fieldset className="gc-formulation" disabled={disabled}>
    <legend className="gc-formulation-title type-label">Final perfume blend</legend>
    <div className="gc-mixture-labels">{NAMES.map((name, i) => <div key={name} className="type-label"><span className={'gc-swatch gc-swatch--' + i} />{name} <strong className="text-tabular">{percent(units[i])}</strong></div>)}</div>
    <div className="gc-mixture-bar" ref={bar} aria-label="Four component formulation">
      {units.map((value, i) => <span key={i} className={'gc-mixture-segment gc-mixture-segment--' + i} style={{ width: value / 2 + '%' }} />)}
      {divisions.map((value, i) => <button key={i} type="button" role="slider" className="gc-mixture-divider" style={{ left: value / 2 + '%' }} disabled={disabled}
        aria-label={NAMES[i] + ' / ' + NAMES[i + 1] + ' boundary'} aria-valuemin={(i === 0 ? 0 : divisions[i - 1]) / 2} aria-valuemax={(i === 2 ? 200 : divisions[i + 1]) / 2} aria-valuenow={value / 2} aria-valuetext={percent(value) + ' from left'}
        onKeyDown={event => keyboard(i, event)}
        onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pointer(i, event); }}
        onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pointer(i, event); }}
        onPointerUp={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) { pointer(i, event); event.currentTarget.releasePointerCapture(event.pointerId); } }}>
        <span aria-hidden="true">↔</span>
      </button>)}
    </div>
  </fieldset>;
}
