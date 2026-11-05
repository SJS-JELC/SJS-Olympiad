import type { QuestionViewProps } from '../catalog';
import { GroupingQuestion } from '../l5p9/GroupingQuestion';
import { doubleTrouble } from './definition';
import { requirePresentation,presentedDefinition,type PresentationPayload } from '../../contracts/presentation';
export interface DoubleTroublePresentation extends PresentationPayload {renderer:'U5P7';items:{id:string;label:string}[];wording:string;}
export function DoubleTrouble(props:QuestionViewProps){
 const {record:{presentation:content}}=requirePresentation<DoubleTroublePresentation>(props.presentation,'U5P7');
 return <GroupingQuestion {...props} definition={presentedDefinition(doubleTrouble,content)} items={content.items} wording={content.wording}/>;
}
