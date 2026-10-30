export type AccordId = 'citrus' | 'floral' | 'woody';
export type SampleId = AccordId | 'mystery';
export type Interval = readonly [number, number];
/** Half-percentage-point units, summing to 200. */
export type Composition = readonly [number, number, number, number];
export type Measurement = { accord: AccordId; interval: Interval; referenceArea: number; mysteryArea: number };
export type GcInteraction = {
  kind: 'gc'; entered: boolean; concentrations?: Record<AccordId, number>; loaded?: {sample: SampleId; concentration: number} | null; results?: {id: number; sample: SampleId; concentration: number; interval: Interval; position?: readonly [number, number]; layer?: number}[];
  activeRun: { id: number; sample: SampleId; concentration?: number; startedAt: number; deadline: number } | null;
  nextRunId: number; analyses: readonly SampleId[];
  reference: AccordId; interval: Interval; measurements: readonly Measurement[];
};
export type GcAction =
  | {type: 'gc-delete-result'; id: number; now: number}
  | {type: 'gc-result-position'; id: number; position?: readonly [number, number]; now: number}
  | {type: 'gc-load'; sample: SampleId; concentration?: number; now: number}
  | {type: 'gc-dilute'; sample: AccordId; value: number; now: number}
  | {type: 'gc-result-interval'; id: number; interval: Interval; now: number}
  | { type: 'gc-enter'; now: number }
  | { type: 'gc-run'; sample: SampleId; now: number }
  | { type: 'gc-reference'; accord: AccordId; now: number }
  | { type: 'gc-interval'; interval: Interval; now: number }
  | { type: 'gc-record'; now: number }
  | { type: 'gc-remove'; accord: AccordId; now: number };
