import type { QuestionViewProps } from '../catalog';
import { GroupingQuestion } from './GroupingQuestion';
import { l5p9 } from './definition';
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';

export interface L5P9Presentation extends PresentationPayload {
  renderer:'L5P9';wording:string;items:readonly {id:string;label:string;assetId:string}[];
}
export function L5Problem9(props: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<L5P9Presentation>(props.presentation,'L5P9');
  const definition=presentedDefinition(l5p9,content);
  const items=content.items.map(item=>({id:item.id,label:item.label,image:assets[item.assetId]}));
  return <GroupingQuestion {...props} definition={definition} items={items} wording={content.wording} />;
}
