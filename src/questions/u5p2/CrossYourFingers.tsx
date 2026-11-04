import { useMemo } from 'react';
import type { QuestionViewProps } from '../catalog';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { DotCrossEditor } from '../../components/dot-cross/DotCrossEditor';
import { emptyDiagram } from '../../components/dot-cross/engine';
import { u5p2 } from './definition';
import './CrossYourFingers.css';
export function CrossYourFingers({attempt,onAction}:QuestionViewProps) {
 const response=useMemo(()=>attempt.answers.diagram ? JSON.parse(attempt.answers.diagram) : emptyDiagram(),[attempt.answers.diagram]);
 return <div className="question-content u5p2-question">
 <QuestionAnswerForm definition={u5p2} attempt={attempt} onAction={onAction} autoFocusAnswer={false} showAwardMessage={false}>
 {({disabled,onEdit})=><section className="question-brief">
 <p className="type-body">One molecular formula doesn’t always tell the whole story, even outside organic chemistry! The formula N₂O allows several formal dot-and-cross arrangements, although not all describe the bonding in nitrous oxide.</p>
 <p className="type-body">Draw three different arrangements on the same canvas: two with nitrogen in the middle and one with oxygen in the middle. Show all outer-shell electrons and give every atom a full outer shell. Alternate dots and crosses between neighbouring atoms to show where the electrons come from.</p>
 <DotCrossEditor initialZoomOutSteps={2} part={{kind:'dot-and-cross',initial:response,markingPolicyId:'igcse-dot-cross:n2o'}} response={response} readOnly={disabled} onResponse={s=>onEdit('diagram',JSON.stringify(s))}/>
 </section>}
 </QuestionAnswerForm></div>;
}
