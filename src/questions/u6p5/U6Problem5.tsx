export interface U6P5Presentation extends PresentationPayload { renderer:'U6P5';text:string[];labelCenters:number[];diagramAspect:number; }
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p5 } from './definition';
import './U6Problem5.css';

export function U6Problem5({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<U6P5Presentation>(presentation,'U6P5');
  const definition=presentedDefinition(u6p5,content);
  return <div className="question-content question-content--dense u6p5-question">
    <section className="question-brief" aria-label={content.text[0]}>
      <p className="type-body">{content.text[1]}</p>
      <p className="type-body">{content.text[2]}</p>
      <p className="type-body">{content.text[3]}</p>
      <figure className="u6p5-diagram"><img src={assets.diagram0} alt={content.text[4]} /><figcaption style={{width:`min(100cqw, calc((100cqh - 3svh) * ${content.diagramAspect}))`}} className="u6p5-diagram-labels type-label"><span style={{left:content.labelCenters[0]+'%'}}>{content.text[5]}</span><span style={{left:content.labelCenters[1]+'%'}}>{content.text[6]}</span><span style={{left:content.labelCenters[2]+'%'}}>{content.text[7]}</span><span style={{left:content.labelCenters[3]+'%'}}>{content.text[8]}</span></figcaption></figure>
    </section>
    <QuestionAnswerForm layout="compact" definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p5-answers">
        <label className="u6p5-answer type-label" htmlFor="u6p5-first">
          <AnswerInput aria-label={content.text[9]} id="u6p5-first" name="first" value={attempt.answers.first ?? ''} maxLength={4} disabled={disabled}
            onValueChange={value => onEdit('first', value)} />
        </label>
        <span className="type-label" aria-hidden="true">{content.text[10]}</span>
        <label className="u6p5-answer type-label" htmlFor="u6p5-second">
          <AnswerInput aria-label={content.text[11]} id="u6p5-second" name="second" value={attempt.answers.second ?? ''} maxLength={1} disabled={disabled}
            onValueChange={value => onEdit('second', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
