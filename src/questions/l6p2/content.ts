import type { PresentationPayload } from '../../contracts/presentation';
export interface L6P2Presentation extends PresentationPayload {
 renderer: 'L6P2'; paragraphs: readonly string[];
}
