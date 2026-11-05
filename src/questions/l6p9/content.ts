import type { PresentationPayload } from '../../contracts/presentation';
export interface L6P9Presentation extends PresentationPayload {
 renderer: 'L6P9'; paragraphs: readonly string[];
 diagrams: readonly { assetId: string; description: string }[];
}
