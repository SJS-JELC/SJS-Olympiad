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
 <p className="type-body">One molecular formula doesn’t always tell the whole story, even outside organic chemistry! Nitrous oxide, N₂O, can be represented by more than one dot-and-cross diagram.</p>
 <p className="type-body">Draw both of its two main electron arrangements as separate molecules on the same canvas, showing all outer-shell electrons. Alternate dots and crosses between neighbouring atoms to show where the electrons come from.</p>
 <DotCrossEditor part={{kind:'dot-and-cross',initial:response,markingPolicyId:'igcse-dot-cross:n2o'}} response={response} readOnly={disabled} onResponse={s=>onEdit('diagram',JSON.stringify(s))}/>
 </section>}
 </QuestionAnswerForm></div>;
}
