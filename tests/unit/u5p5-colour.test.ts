import {describe,it,expect} from 'vitest';
import {sampleColour} from '../../src/questions/u5p5/sampleColour';
describe('sample dilution colours',()=>{
 it('fades each scent to ethanol white and clamps invalid bounds',()=>{
  for(const sample of ['citrus','floral','woody','mystery'] as const){
   expect(sampleColour(sample,0)).toBe('rgb(255, 255, 255)');
   expect(sampleColour(sample,100)).not.toBe(sampleColour(sample,50));
   expect(sampleColour(sample,120)).toBe(sampleColour(sample,100));
  }
 });
 it('uses bright yellow for pure citrus and pale yellow for half strength',()=>{
  expect(sampleColour('citrus',100)).toBe('rgb(255, 210, 0)');
  expect(sampleColour('citrus',50)).toBe('rgb(255, 233, 128)');
 });
});
