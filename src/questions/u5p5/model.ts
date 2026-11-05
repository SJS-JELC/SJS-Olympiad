import type { Composition, Interval, SampleId } from './types';


export const RUN_MS = 4000;


export type TracePoint = { time: number; response: number };
export type TraceDataset = Partial<Record<SampleId, readonly TracePoint[]>>;
/** Traces arrive only from an authorized question response. No recipe is shipped. */
export function getTrace(sample: SampleId, data: TraceDataset = {}): readonly TracePoint[] {
  return data[sample] ?? [{time:0,response:0}];
}

function boundedInterval(interval: Interval, TIME_MAX:number): Interval {
  const first = Number.isFinite(interval[0]) ? interval[0] : 0;
  const second = Number.isFinite(interval[1]) ? interval[1] : TIME_MAX;
  const low = Math.max(0, Math.min(TIME_MAX, Math.min(first, second)));
  const high = Math.max(0, Math.min(TIME_MAX, Math.max(first, second)));
  return [low, high];
}

function responseAt(trace: readonly TracePoint[], time: number): number {
  const TIME_MAX=trace[trace.length-1].time, STEP=trace.length>1?trace[1].time-trace[0].time:1;
  if (time <= 0) return trace[0].response;
  if (time >= TIME_MAX) return trace[trace.length - 1].response;
  const index = time / STEP;
  const leftIndex = Math.floor(index);
  const left = trace[leftIndex];
  const right = trace[leftIndex + 1];
  const fraction = (time - left.time) / (right.time - left.time);
  return left.response + fraction * (right.response - left.response);
}

/** Integrates a selected window with a constant-baseline correction and trapezoids. */
export function integrate(sample: SampleId, interval: Interval, data: TraceDataset = {}): number {
  const trace = getTrace(sample, data);
  const TIME_MAX=trace[trace.length-1].time, STEP=trace.length>1?trace[1].time-trace[0].time:1, BASELINE=trace[0].response;
  const [start,end]=boundedInterval(interval,TIME_MAX);
  if(end<=start)return 0;
  const points: TracePoint[] = [{ time: start, response: responseAt(trace, start) }];
  const firstInterior = Math.floor(start / STEP) + 1;
  for (let index = firstInterior; index < trace.length && trace[index].time < end; index++) {
    points.push(trace[index]);
  }
  points.push({ time: end, response: responseAt(trace, end) });

  let area = 0;
  for (let index = 1; index < points.length; index++) {
    const left = points[index - 1];
    const right = points[index];
    const leftSignal = Math.max(0, left.response - BASELINE);
    const rightSignal = Math.max(0, right.response - BASELINE);
    area += ((leftSignal + rightSignal) / 2) * (right.time - left.time);
  }
  return area;
}

/**
 * Helps a learner select an isolated peak without identifying accord markers.
 * A window containing exactly one peak is centred on that peak and given 0.09
 * minute of space on each side. A narrow click can snap to a peak within 0.05
 * minute. Broad or ambiguous windows are only clamped to the run bounds.
 */
export function snapInterval(interval: Interval, GUIDE_VALUES:readonly number[],TIME_MAX:number): Interval {
  const [start, end] = boundedInterval(interval,TIME_MAX);
  const center = (start + end) / 2;
  const enclosed = GUIDE_VALUES.filter(time => time >= start && time <= end);
  let selected: number | undefined;

  if (enclosed.length === 1) {
    selected = enclosed[0];
  } else if (enclosed.length === 0 && end - start <= 0.05) {
    const distances = GUIDE_VALUES.map(time => Math.abs(time - center));
    const nearestDistance = Math.min(...distances);
    const nearest = GUIDE_VALUES.filter((_, index) => Math.abs(distances[index] - nearestDistance) < 1e-9);
    if (nearest.length === 1 && nearestDistance <= 0.05) selected = nearest[0];
  }

  if (selected === undefined) return [start, end];
  const index = GUIDE_VALUES.indexOf(selected);
  const previous = GUIDE_VALUES[index - 1];
  const next = GUIDE_VALUES[index + 1];
  const leftLimit = previous === undefined ? 0 : (previous + selected) / 2;
  const rightLimit = next === undefined ? TIME_MAX : (selected + next) / 2;
  return [Number(Math.max(leftLimit, selected - 0.09).toFixed(3)), Number(Math.min(rightLimit, selected + 0.09).toFixed(3))];
}

/** Parse JSON-encoded half-percentage-point units, defaulting incomplete or invalid input. */
export function getComposition(answers: Readonly<Record<string, string>>, initialComposition:Composition): Composition {
  const encoded = answers.composition?.trim();
  if (!encoded) return initialComposition;
  try {
    const units: unknown = JSON.parse(encoded);
    return validComposition(units,initialComposition) ? [...units] : initialComposition;
  } catch {
    return initialComposition;
  }
}

export function validComposition(units: unknown, initial: Composition): units is Composition {
  const total=initial.reduce((sum,value)=>sum+value,0);
  return Array.isArray(units)
    && units.length === initial.length
    && units.every(value => Number.isInteger(value) && value >= 0 && value <= total)
    && units.reduce<number>((sum, value) => sum + value, 0) === total;
}
