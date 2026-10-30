import type { PracticalField, PracticalYear } from '../cloud/api';
import protocols from './protocols.json';

export type PracticalDefinition = { year: PracticalYear; title: string; protocol: string; html: boolean; fields: { key: PracticalField; label: string; unit: string }[] };
export const practicalCatalog: PracticalDefinition[] = [
  { year: 'L5', ...protocols.L5, fields: [
    { key: 'numPracticalResponse1', label: 'Volume of cuttlebone', unit: 'cm³' },
    { key: 'numPracticalResponse2', label: 'Average titre', unit: 'cm³' },
    { key: 'numPracticalResponse3', label: 'Moles of HCl reacted with cuttlebone', unit: 'mol' },
    { key: 'numPracticalResponse4', label: 'Density of cuttlebone', unit: 'g/cm³' },
  ] },
  { year: 'L6', ...protocols.L6, fields: [
    { key: 'numPracticalResponse3', label: 'Average titre', unit: 'cm³' },
    { key: 'numPracticalResponse4', label: 'Mass of salt in bag of crisps', unit: 'g' },
  ] },
  { year: 'U6', ...protocols.U6, fields: [
    { key: 'numPracticalResponse1', label: 'Mass of paperclip', unit: 'g' },
    { key: 'numPracticalResponse2', label: 'Absorbance of MnO₄⁻ from paperclip', unit: '' },
    { key: 'numPracticalResponse3', label: 'Concentration of MnO₄⁻', unit: 'mol dm⁻³' },
    { key: 'numPracticalResponse4', label: "Percentage of paperclip's mass that is Mn", unit: '%' },
  ] },
];
export const findPractical = (year: string | undefined) => practicalCatalog.find(item => item.year === year);
/** Keep the raw value (including entered precision) separate from numeric validation. */
export function validPracticalNumber(text: string): boolean {
  return text.length <= 80 && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text.trim()) && Number.isFinite(Number(text)) && Math.abs(Number(text)) <= 1e100 && (Number(text) !== 0 || !/[1-9]/.test(text.trim().split(/[eE]/)[0]));
}
