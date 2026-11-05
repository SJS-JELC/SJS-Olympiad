export interface U6P4Presentation extends PresentationPayload { renderer:'U6P4';text:string[];diagramAspect:[number,number];answerCenters:number[]; }
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import { useLayoutEffect, useRef } from 'react';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p4 } from './definition';
import './U6Problem4.css';

export function U6Problem4({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<U6P4Presentation>(presentation,'U6P4');
  const definition=presentedDefinition(u6p4,content);
  const questionRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const figure = figureRef.current;
    if (!figure) return;
    // Align answers to the contained source image, including any side letterboxing.
    const measure = () => questionRef.current?.style.setProperty('--u6p4-diagram-width', `${Math.min(figure.clientWidth, figure.clientHeight * content.diagramAspect[0] / content.diagramAspect[1])}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(figure);
    return () => observer.disconnect();
  }, [content]);
  return <div ref={questionRef} className="question-content question-content--aligned u6p4-question">
    <section className="question-brief" aria-label={content.text[0]}>
      <p className="type-body">{content.text[1]}</p>
      <figure ref={figureRef} className="u6p4-diagram"><img src={assets.diagram0} alt={content.text[2]} /></figure>
    </section>
    <QuestionAnswerForm layout="aligned" definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p4-answers">
        {(['a', 'b', 'c'] as const).map((id,index) => <label style={{left:content.answerCenters[index]+'%'}} className="u6p4-answer type-label" key={id} htmlFor={'u6p4-' + id}>
          <AnswerInput aria-label={definition.parts[0].fields.find(field=>field.id===id)?.label} id={'u6p4-' + id} name={id} value={attempt.answers[id] ?? ''} inputMode="decimal" maxLength={3} disabled={disabled}
            onValueChange={value => onEdit(id, value)} />
        </label>)}
      </div>}
    </QuestionAnswerForm>
  </div>;
}
