import { useId, useRef, type PointerEvent } from 'react';
import { getTrace, integrate, RETENTION_TIMES, SAMPLE_LABELS, TIME_MAX } from './model';
import type { Interval, SampleId } from './types';

const LEFT = 58, RIGHT = 880, TOP = 22;
const x = (time: number) => LEFT + time / TIME_MAX * (RIGHT - LEFT);
export function Chromatogram({ sample, interval, onInterval, compact = false, concentration = 100 }: {
  sample: SampleId; interval: Interval; onInterval?: (interval: Interval) => void; compact?: boolean; concentration?: number;
}) {
  const id = useId().replaceAll(':', '');
  // Short plotting geometry preserves full-width lettering rather than shrinking a tall SVG.
  const BOTTOM = compact ? 100 : 360;
  const height = BOTTOM + 38;
  const middle = (TOP + BOTTOM) / 2;
  const drag = useRef<{ start: number; edge: 0 | 1 | null; original: Interval; latest: Interval } | null>(null);
  const trace = getTrace(sample).map(point => ({...point, response: 7.5 + (point.response - 7.5) * concentration / 100}));
  const maximum = 18000;
  const y = (response: number) => BOTTOM - response / maximum * (BOTTOM - TOP);
  const path = trace.map((point, i) => (i ? 'L' : 'M') + x(point.time).toFixed(2) + ' ' + y(point.response).toFixed(2)).join(' ');
  const shade = path + ' L' + RIGHT + ' ' + y(trace[0].response) + ' L' + LEFT + ' ' + y(trace[0].response) + ' Z';
  const coordinate = (event: PointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return 0;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return Math.max(0, Math.min(TIME_MAX, (point.x - LEFT) / (RIGHT - LEFT) * TIME_MAX));
  };
  const update = (time: number) => {
    const active = drag.current;
    if (!active || !onInterval) return;
    const next: Interval = active.edge === 0 ? [Math.min(time, active.original[1] - .01), active.original[1]]
      : active.edge === 1 ? [active.original[0], Math.max(time, active.original[0] + .01)]
      : [Math.min(active.start, time), Math.max(active.start, time)];
    active.latest = [Math.max(0, next[0]), Math.min(TIME_MAX, Math.max(next[0] + .01, next[1]))];
    onInterval(active.latest);
  };
  return <figure className={'gc-chromatogram' + (compact ? ' gc-chromatogram--compact' : '')}>
    {!compact && <figcaption className="gc-area-readout type-label">Area under peak: <strong>{(integrate(sample, interval) * concentration / 100).toFixed(3)}</strong></figcaption>}
    {!compact && <div className="gc-area-note type-caption"><p>For a specific component, the area under the peak is proportional to the amount of that substance in the sample. Drag across a peak to see the area underneath it.</p></div>}
    <svg viewBox={'0 0 900 ' + height} className={onInterval ? 'gc-trace gc-trace--interactive' : 'gc-trace'} role={onInterval ? 'group' : 'img'} aria-label={SAMPLE_LABELS[sample] + ' chromatogram. Retention time in minutes; detector response. Vertical scale zero to ' + maximum}
      onPointerDown={onInterval ? event => {
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
        const time = coordinate(event);
        const handle = (event.target as Element).closest('[data-boundary]');
        const edge = handle ? Number(handle.getAttribute('data-boundary')) as 0 | 1 : null;
        drag.current = { start: time, edge, original: interval, latest: interval };
        if (edge === null) update(time);
      } : undefined}
      onPointerMove={event => { if (drag.current) update(coordinate(event)); }}
      onPointerUp={event => { if (drag.current) { update(coordinate(event)); onInterval?.(drag.current.latest); drag.current = null; } }}
      onPointerCancel={() => { drag.current = null; }}>
      <defs><clipPath id={id}><rect x={x(interval[0])} y="0" width={x(interval[1]) - x(interval[0])} height={BOTTOM} /></clipPath></defs>
      {[0, .5, 1].map(fraction => <g key={fraction}><line x1={LEFT} x2={RIGHT} y1={y(fraction * maximum)} y2={y(fraction * maximum)} stroke="#e1e8ed" /><text x={LEFT - 8} y={y(fraction * maximum) + 4} textAnchor="end" className="type-caption">{(fraction * maximum).toFixed(0)}</text></g>)}
      <path d={shade} fill="#999" fillOpacity=".6" clipPath={'url(#' + id + ')'} />
      <path d={path} fill="none" stroke={'#111'} strokeWidth="2.3" />
      <path d={'M' + LEFT + ' ' + TOP + 'V' + BOTTOM + 'H' + RIGHT} fill="none" stroke="#243749" strokeWidth="1.4" />
      {Array.from({ length: 6 }, (_, i) => <g key={i}><path d={'M' + x(i) + ' ' + BOTTOM + 'v5'} stroke="#243749" /><text x={x(i)} y={BOTTOM + 19} textAnchor="middle" className="type-caption">{i}</text></g>)}
      {RETENTION_TIMES.map(time => <g key={time}><path d={'M' + x(time) + ' ' + TOP + 'v' + (BOTTOM - TOP)} stroke="#6e8792" strokeWidth=".65" strokeDasharray="2 5" /><text x={x(time)} y={TOP - 7} textAnchor="middle" className="type-caption">{time.toFixed(1)}</text></g>)}
      {onInterval && interval.map((time, i) => <g key={i} data-boundary={i} className="gc-boundary" role="slider" tabIndex={0} aria-label={i === 0 ? 'Integration start' : 'Integration end'} aria-valuemin={i === 0 ? 0 : interval[0] + .01} aria-valuemax={i === 0 ? interval[1] - .01 : TIME_MAX} aria-valuenow={time} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const next = [...interval] as [number, number];
        next[i] = Math.max(i === 0 ? 0 : interval[0] + .01, Math.min(i === 0 ? interval[1] - .01 : TIME_MAX, time + (event.key === 'ArrowLeft' ? -.01 : .01)));
        onInterval(next);
      }}><title>Drag to move this boundary</title><rect x={x(time)-10} y={TOP} width="20" height={BOTTOM-TOP+8} fill="transparent"/><line x1={x(time)} x2={x(time)} y1={TOP} y2={BOTTOM} stroke="#111" strokeWidth="2" /><path d={'M' + (x(time) - 5) + ' ' + (BOTTOM - 7) + 'l5 7 5 -7'} fill="#111" /></g>)}
      <text x="17" y={middle} transform={'rotate(-90 17 ' + middle + ')'} textAnchor="middle" className="type-caption">Response</text>
      <text x="470" y={BOTTOM + 34} textAnchor="middle" className="type-caption">Retention time / min</text>
    </svg>
  </figure>;
}
