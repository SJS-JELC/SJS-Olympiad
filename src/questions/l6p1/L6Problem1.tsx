import type { QuestionViewProps } from '../catalog';
import { GroupingQuestion } from '../l5p9/GroupingQuestion';
import { l6p1 } from './definition';
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
export interface L6P1Presentation extends PresentationPayload {
  renderer: 'L6P1'; wording: string;
  items: readonly { id: string; label: string; assetId: string; presentation: 'element' }[];
}
export function L6Problem1(props: QuestionViewProps) {
  const { record: { presentation: content }, assets } = requirePresentation<L6P1Presentation>(props.presentation, 'L6P1');
  const definition = presentedDefinition(l6p1, content);
  return <GroupingQuestion {...props} definition={definition} wording={content.wording}
    items={content.items.map(item => ({ ...item, image: assets[item.assetId] }))} />;
}
