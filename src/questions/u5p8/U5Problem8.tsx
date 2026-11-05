import { useEffect, useRef, useState } from 'react';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u5p8 } from './definition';
import {requirePresentation,presentedDefinition,type PresentationPayload} from '../../contracts/presentation';
import type {DiagramNode} from './FlaskDiagram';
export interface BoundariesPresentation extends PresentationPayload {renderer:'U5P8';paragraphs:string[];diagram:DiagramNode;referenceDiagram:DiagramNode;referenceTitle:string;referenceFormula:string;referenceFormulaLabel:string;closeReferenceLabel:string;openReferenceLabel:string;answerLabel:string;unit:string;}
import { CapSketch, FlaskDiagram } from './FlaskDiagram';
import './U5Problem8.css';

function VolumeReference({ onClose,content }: { onClose: () => void;content:BoundariesPresentation }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="u5p8-reference" aria-labelledby="u5p8-reference-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <button type="button" className="u5p8-reference-close type-heading" aria-label={content.closeReferenceLabel} onClick={onClose}>×</button>
    <h2 id="u5p8-reference-title" className="type-heading">{content.referenceTitle}</h2>
    <p className="u5p8-formula type-body" aria-label={content.referenceFormulaLabel}>{content.referenceFormula}</p>
    <CapSketch node={content.referenceDiagram} />
  </dialog>;
}

export function U5Problem8({ attempt, onAction,presentation }: QuestionViewProps) {
  const {record:{presentation:content}}=requirePresentation<BoundariesPresentation>(presentation,'U5P8');
  const [referenceOpen, setReferenceOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasReferenceOpen = useRef(false);
  useEffect(() => {
    if (wasReferenceOpen.current && !referenceOpen) trigger.current?.focus({ preventScroll: true });
    wasReferenceOpen.current = referenceOpen;
  }, [referenceOpen]);
  return <div className="question-content question-content--aligned u5p8-question" data-testid="u5p8-content">
    <section className="question-brief u5p8-brief" aria-label="Question">
      <div className="u5p8-prompt">{content.paragraphs.map(text => <p className="type-body" key={text}>{text}</p>)}</div>
      <div className="u5p8-illustration">
        <FlaskDiagram node={content.diagram} />
        <button ref={trigger} type="button" className="ui-button u5p8-reference-trigger type-label" aria-label={content.openReferenceLabel}
          aria-haspopup="dialog" onClick={() => setReferenceOpen(true)}>?</button>
      </div>
    </section>
    <QuestionAnswerForm definition={presentedDefinition(u5p8,content)} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u5p8-answer">
        <AnswerInput id="u5p8-answer" name="answer" aria-label={content.answerLabel} value={attempt.answers.answer ?? ''}
          inputMode="decimal" maxLength={12} disabled={disabled} onValueChange={value => onEdit('answer', value)} />
        <span className="type-body" aria-hidden="true">{content.unit}</span>
      </div>}
    </QuestionAnswerForm>
    {referenceOpen && <VolumeReference content={content} onClose={() => setReferenceOpen(false)} />}
  </div>;
}
