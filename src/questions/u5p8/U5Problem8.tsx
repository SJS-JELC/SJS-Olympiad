import { useEffect, useRef, useState } from 'react';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u5p8 } from './definition';
import { wording } from './content';
import { CapSketch, FlaskDiagram } from './FlaskDiagram';
import './U5Problem8.css';

function VolumeReference({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="u5p8-reference" aria-labelledby="u5p8-reference-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="u5p8-reference-title" className="type-heading">Spherical cap volume</h2>
    <p className="u5p8-formula type-body" aria-label="V equals pi h squared times three R minus h, divided by three">V = πh²(3R − h)/3</p>
    <CapSketch />
    <p className="type-caption">R: sphere radius · h: cap height</p>
    <button type="button" className="ui-button type-label" onClick={onClose}>Close reference</button>
  </dialog>;
}

export function U5Problem8({ attempt, onAction }: QuestionViewProps) {
  const [referenceOpen, setReferenceOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasReferenceOpen = useRef(false);
  useEffect(() => {
    if (wasReferenceOpen.current && !referenceOpen) trigger.current?.focus({ preventScroll: true });
    wasReferenceOpen.current = referenceOpen;
  }, [referenceOpen]);
  return <div className="question-content question-content--aligned u5p8-question" data-testid="u5p8-content">
    <section className="question-brief u5p8-brief" aria-label="Question">
      <div className="u5p8-prompt">{wording.map(text => <p className="type-body" key={text}>{text}</p>)}</div>
      <div className="u5p8-illustration">
        <FlaskDiagram />
        <button ref={trigger} type="button" className="ui-button u5p8-reference-trigger type-label" aria-label="Open spherical cap volume reference"
          aria-haspopup="dialog" onClick={() => setReferenceOpen(true)}>?</button>
      </div>
    </section>
    <QuestionAnswerForm definition={u5p8} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u5p8-answer">
        <AnswerInput id="u5p8-answer" name="answer" aria-label="Volume of solution added in cm³" value={attempt.answers.answer ?? ''}
          inputMode="decimal" maxLength={12} disabled={disabled} onValueChange={value => onEdit('answer', value)} />
        <span className="type-body" aria-hidden="true">cm³</span>
      </div>}
    </QuestionAnswerForm>
    {referenceOpen && <VolumeReference onClose={() => setReferenceOpen(false)} />}
  </div>;
}
