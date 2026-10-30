/** 100% accord reference samples plus one unnamed mixture. */
export const SAMPLE_LABELS = {
    citrus: 'Citrus scent',
    floral: 'Floral scent',
    woody: 'Woody scent',
    mystery: 'Mystery sample',
};
export const ACCORDS = ['citrus', 'floral', 'woody'];
export const SAMPLES = ['citrus', 'floral', 'woody', 'mystery'];
export const RUN_MS = 6000;
export const TIME_MAX = 5.4;
export const RETENTION_TIMES = [1.1, 2.0, 2.8, 3.2, 3.4, 4.1, 4.8];
const STEP = 0.002;
const SIGMA = 0.025;
const BASELINE = 7.5;
const DEFAULT_COMPOSITION = [50, 50, 50, 50];
// Each listed fraction is a share of a common 2000-area pure-sample response.
// The overlapping 1.1 and 2.0 minute peaks intentionally add linearly.
const RECIPE = [25, 14, 9, 152];
const PURE_COMPONENTS = {
    citrus: [
        { time: 1.1, fraction: 0.4 },
        { time: 2.0, fraction: 0.4 },
        { time: 3.4, fraction: 0.2 },
    ],
    floral: [
        { time: 2.0, fraction: 0.4 },
        { time: 2.8, fraction: 0.3 },
        { time: 4.1, fraction: 0.3 },
    ],
    woody: [
        { time: 1.1, fraction: 0.4 },
        { time: 3.2, fraction: 0.1 },
        { time: 4.8, fraction: 0.5 },
    ],
};
const TRACE_COUNT = Math.round(TIME_MAX / STEP);
const TRACE_CACHE = new Map();
function makeTrace(sample) {
    const peaks = sample === 'mystery'
        ? ACCORDS.flatMap((accord, index) => PURE_COMPONENTS[accord].map(peak => ({ ...peak, fraction: peak.fraction * RECIPE[index] / 200 })))
        : PURE_COMPONENTS[sample];
    return Array.from({ length: TRACE_COUNT + 1 }, (_, index) => {
        const time = Number((index * STEP).toFixed(3));
        const response = peaks.reduce((sum, peak) => {
            const area = 2000 * peak.fraction;
            const distance = (time - peak.time) / SIGMA;
            return sum + (area / (SIGMA * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * distance * distance);
        }, BASELINE);
        return { time, response };
    });
}
/** Deterministic, noise-free signal density, with shared peaks summed linearly. */
export function getTrace(sample) {
    let trace = TRACE_CACHE.get(sample);
    if (!trace) {
        trace = makeTrace(sample);
        TRACE_CACHE.set(sample, trace);
    }
    return trace;
}
function boundedInterval(interval) {
    const first = Number.isFinite(interval[0]) ? interval[0] : 0;
    const second = Number.isFinite(interval[1]) ? interval[1] : TIME_MAX;
    const low = Math.max(0, Math.min(TIME_MAX, Math.min(first, second)));
    const high = Math.max(0, Math.min(TIME_MAX, Math.max(first, second)));
    return [low, high];
}
function responseAt(trace, time) {
    if (time <= 0)
        return trace[0].response;
    if (time >= TIME_MAX)
        return trace[trace.length - 1].response;
    const index = time / STEP;
    const leftIndex = Math.floor(index);
    const left = trace[leftIndex];
    const right = trace[leftIndex + 1];
    const fraction = (time - left.time) / (right.time - left.time);
    return left.response + fraction * (right.response - left.response);
}
/** Integrates a selected window with a constant-baseline correction and trapezoids. */
export function integrate(sample, interval) {
    const [start, end] = boundedInterval(interval);
    if (end <= start)
        return 0;
    const trace = getTrace(sample);
    const points = [{ time: start, response: responseAt(trace, start) }];
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
export function snapInterval(interval) {
    const [start, end] = boundedInterval(interval);
    const center = (start + end) / 2;
    const enclosed = RETENTION_TIMES.filter(time => time >= start && time <= end);
    let selected;
    if (enclosed.length === 1) {
        selected = enclosed[0];
    }
    else if (enclosed.length === 0 && end - start <= 0.05) {
        const distances = RETENTION_TIMES.map(time => Math.abs(time - center));
        const nearestDistance = Math.min(...distances);
        const nearest = RETENTION_TIMES.filter((_, index) => Math.abs(distances[index] - nearestDistance) < 1e-9);
        if (nearest.length === 1 && nearestDistance <= 0.05)
            selected = nearest[0];
    }
    if (selected === undefined)
        return [start, end];
    const index = RETENTION_TIMES.indexOf(selected);
    const previous = RETENTION_TIMES[index - 1];
    const next = RETENTION_TIMES[index + 1];
    const leftLimit = previous === undefined ? 0 : (previous + selected) / 2;
    const rightLimit = next === undefined ? TIME_MAX : (selected + next) / 2;
    return [Number(Math.max(leftLimit, selected - 0.09).toFixed(3)), Number(Math.min(rightLimit, selected + 0.09).toFixed(3))];
}
/** Parse JSON-encoded half-percentage-point units, defaulting incomplete or invalid input. */
export function getComposition(answers) {
    const encoded = answers.composition?.trim();
    if (!encoded)
        return DEFAULT_COMPOSITION;
    try {
        const units = JSON.parse(encoded);
        return validComposition(units) ? [units[0], units[1], units[2], units[3]] : DEFAULT_COMPOSITION;
    }
    catch {
        return DEFAULT_COMPOSITION;
    }
}
export function validComposition(units) {
    return Array.isArray(units)
        && units.length === 4
        && units.every(value => Number.isInteger(value) && value >= 0 && value <= 200)
        && units.reduce((sum, value) => sum + value, 0) === 200;
}
export function isCorrectComposition(units) {
    return validComposition(units)
        && units.every((value, index) => value === RECIPE[index]);
}
