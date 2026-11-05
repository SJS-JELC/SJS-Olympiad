import type { PracticalField, PracticalYear } from '../cloud/api';
import type { PresentationPayload } from '../contracts/presentation';

export type PracticalDefinition = { year: PracticalYear; title: string; fields: { key: PracticalField }[] };
export interface PracticalPresentation extends PresentationPayload { protocol: string; html: boolean; fields: { key: PracticalField; label: string; unit: string }[]; image?: {assetId:string;alt:string;width:number;height:number}; }
export const practicalCatalog: PracticalDefinition[] = [
  { year: 'L5', title: 'Practical', fields: [{key:'numPracticalResponse1'},{key:'numPracticalResponse2'},{key:'numPracticalResponse3'},{key:'numPracticalResponse4'}] },
  { year: 'L6', title: 'Practical', fields: [{key:'numPracticalResponse3'},{key:'numPracticalResponse4'}] },
  { year: 'U6', title: 'Practical', fields: [{key:'numPracticalResponse1'},{key:'numPracticalResponse2'},{key:'numPracticalResponse3'},{key:'numPracticalResponse4'}] },
];
export const findPractical = (year: string | undefined) => practicalCatalog.find(item => item.year === year);
/** Keep the raw value (including entered precision) separate from numeric validation. */
export function validPracticalNumber(text: string): boolean {
  return text.length <= 80 && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text.trim()) && Number.isFinite(Number(text)) && Math.abs(Number(text)) <= 1e100 && (Number(text) !== 0 || !/[1-9]/.test(text.trim().split(/[eE]/)[0]));
}
