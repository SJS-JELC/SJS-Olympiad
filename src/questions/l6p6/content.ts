import type { PresentationPayload } from '../../contracts/presentation';
export interface L6P6Presentation extends PresentationPayload {
 renderer: 'L6P6'; paragraphs: readonly string[];
}
