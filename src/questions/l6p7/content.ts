import type { PresentationPayload } from '../../contracts/presentation';
export interface L6P7Presentation extends PresentationPayload {
 renderer: 'L6P7'; paragraphs: readonly string[];
 diagrams: readonly { assetId: string; description: string }[];
}
