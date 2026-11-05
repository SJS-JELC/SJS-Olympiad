import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import { useMemo } from 'react';
import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { DotCrossEditor, type DotCrossConfiguration } from '../../components/dot-cross/DotCrossEditor';
import { emptyDiagram } from '../../components/dot-cross/engine';
import { u5p2 } from './definition';
import './CrossYourFingers.css';
export interface CrossYourFingersPresentation extends PresentationPayload {renderer:'U5P2';paragraphs:string[];markingPolicyId:string;editor:DotCrossConfiguration;}
export function CrossYourFingers({attempt,onAction,presentation}:QuestionViewProps) {
 const {record:{presentation:content}}=requirePresentation<CrossYourFingersPresentation>(presentation,'U5P2');
 const response=useMemo(()=>attempt.answers.diagram ? JSON.parse(attempt.answers.diagram) : emptyDiagram(),[attempt.answers.diagram]);
 return <div className="question-content u5p2-question">
 <QuestionAnswerForm definition={presentedDefinition(u5p2,content)} attempt={attempt} onAction={onAction} autoFocusAnswer={false} showAwardMessage={false}>
 {({disabled,onEdit})=><section className="question-brief">
 <p className="type-body">{content.paragraphs[0]}</p>
 <p className="type-body">{content.paragraphs[1]}</p>
 <DotCrossEditor configuration={content.editor} initialZoomOutSteps={2} part={{kind:'dot-and-cross',initial:response,markingPolicyId:content.markingPolicyId}} response={response} readOnly={disabled} onResponse={s=>onEdit('diagram',JSON.stringify(s))}/>
 </section>}
 </QuestionAnswerForm></div>;
}
