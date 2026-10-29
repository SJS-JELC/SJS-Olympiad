import type { SampleId } from './types';
const colours: Record<SampleId, readonly number[]> = {
 citrus: [255, 210, 0], floral: [238, 80, 155], woody: [155, 92, 36], mystery: [153, 76, 210],
};
/** Same captured concentration colours the vial, injector and travelling sample. */
export function sampleColour(sample: SampleId, concentration = 100): string {
 const fraction = Math.max(0, Math.min(100, concentration)) / 100;
 return 'rgb(' + colours[sample].map(channel => Math.round(255 + (channel - 255) * fraction)).join(', ') + ')';
}
