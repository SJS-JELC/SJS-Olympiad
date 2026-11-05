import type {GcPresentation} from './presentation';
import { useId, useRef, type PointerEvent } from 'react';
import { getTrace } from './model';
import type { TraceDataset } from './model';
import type { Interval, SampleId } from './types';

const LEFT = 58, RIGHT = 880, TOP = 22;

export function TraceChart({ sample, interval, onInterval, compact = false, concentration = 100, traces = {},content }: {
 content:GcPresentation;
  sample: SampleId; interval: Interval; onInterval?: (interval: Interval) => void; compact?: boolean; concentration?: number; traces?: TraceDataset;
}) {
  const {timeMax:TIME_MAX,guideValues:GUIDE_VALUES,maximum,baseline}=content;
  const x = (time:number)=>LEFT+time/TIME_MAX*(RIGHT-LEFT);
  const id = useId().replaceAll(':', '');
  // Short plotting geometry preserves full-width lettering rather than shrinking a tall SVG.
  const BOTTOM = compact ? 100 : 360;
  const height = BOTTOM + 38;
  const middle = (TOP + BOTTOM) / 2;
  const drag = useRef<{ start: number; edge: 0 | 1 | null; original: Interval; latest: Interval } | null>(null);
  const trace = getTrace(sample, traces).map(point => ({...point, response: baseline + (point.response - baseline) * concentration / 100}));
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
  return <figure className={'gc-chart' + (compact ? ' gc-chart--compact' : '')}>
    {!compact && <div className="gc-area-note type-caption"><p>{content.words.areaHint}</p><p>{content.words.compareHint}</p></div>}
    <svg viewBox={'0 0 900 ' + height} className={onInterval ? 'gc-trace gc-trace--interactive' : 'gc-trace'} role={onInterval ? 'group' : 'img'} aria-label={content.sampleLabels[sample] + content.words.chartDescription + maximum}
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
      {content.tickValues.map((i) => <g key={i}><path d={'M' + x(i) + ' ' + BOTTOM + 'v5'} stroke="#243749" /><text x={x(i)} y={BOTTOM + 19} textAnchor="middle" className="type-caption">{i}</text></g>)}
      {GUIDE_VALUES.map(time => <g key={time}><path d={'M' + x(time) + ' ' + TOP + 'v' + (BOTTOM - TOP)} stroke="#6e8792" strokeWidth=".65" strokeDasharray="2 5" /><text x={x(time)} y={TOP - 7} textAnchor="middle" className="type-caption">{time.toFixed(1)}</text></g>)}
      {onInterval && interval.map((time, i) => <g key={i} data-boundary={i} className="gc-boundary" role="slider" tabIndex={0} aria-label={i === 0 ? content.words.integrationStart : content.words.integrationEnd} aria-valuemin={i === 0 ? 0 : interval[0] + .01} aria-valuemax={i === 0 ? interval[1] - .01 : TIME_MAX} aria-valuenow={time} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const next = [...interval] as [number, number];
        next[i] = Math.max(i === 0 ? 0 : interval[0] + .01, Math.min(i === 0 ? interval[1] - .01 : TIME_MAX, time + (event.key === 'ArrowLeft' ? -.01 : .01)));
        onInterval(next);
      }}><title>Drag to move this boundary</title><rect x={x(time)-10} y={TOP} width="20" height={BOTTOM-TOP+8} fill="transparent"/><line x1={x(time)} x2={x(time)} y1={TOP} y2={BOTTOM} stroke="#111" strokeWidth="2" /><path d={'M' + (x(time) - 5) + ' ' + (BOTTOM - 7) + 'l5 7 5 -7'} fill="#111" /></g>)}
      <text x="8" y={middle} transform={'rotate(-90 8 ' + middle + ')'} textAnchor="middle" className="type-caption">{content.words.response}</text>
      <text x="470" y={BOTTOM + 34} textAnchor="middle" className="type-caption">{content.words.time}</text>
    </svg>
  </figure>;
}
