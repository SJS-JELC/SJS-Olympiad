import {describe,it,expect} from 'vitest';
import {sampleColour} from '../../src/questions/u5p5/sampleColour';
// @ts-expect-error Node-only protected scientific reference.
import {u5p5Presentation} from '../../api/src/presentation/records/u5p5.mjs';
const colours=u5p5Presentation.presentation.sampleColours;
describe('sample dilution colours',()=>{
 it('fades each scent to ethanol white and clamps invalid bounds',()=>{
  for(const sample of ['citrus','floral','woody','mystery'] as const){
   expect(sampleColour(colours[sample],0)).toBe('rgb(255, 255, 255)');
   expect(sampleColour(colours[sample],100)).not.toBe(sampleColour(colours[sample],50));
   expect(sampleColour(colours[sample],120)).toBe(sampleColour(colours[sample],100));
  }
 });
 it('uses bright yellow for pure citrus and pale yellow for half strength',()=>{
  expect(sampleColour(colours.citrus,100)).toBe('rgb(255, 210, 0)');
  expect(sampleColour(colours.citrus,50)).toBe('rgb(255, 233, 128)');
 });
});
