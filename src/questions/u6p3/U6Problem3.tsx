export interface U6P3Presentation extends PresentationPayload { renderer:'U6P3';text:string[]; }
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p3 } from './definition';
import './U6Problem3.css';

export function U6Problem3({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<U6P3Presentation>(presentation,'U6P3');
  const definition=presentedDefinition(u6p3,content);
  return <div className="question-content question-content--dense u6p3-question">
    <section className="question-brief" aria-label={content.text[0]}>
      <p className="type-body">{content.text[1]}</p>
      <p className="type-body">{content.text[2]}</p>
      <p className="type-body">{content.text[3]}</p>
      <p className="type-body">{content.text[4]}</p>
      <figure className="u6p3-diagram"><img src={assets.diagram0} alt={content.text[5]} /></figure>
    </section>
    <QuestionAnswerForm layout="compact" definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p3-answers">
        <label className="u6p3-answer type-label" htmlFor="u6p3-answer">
          <AnswerInput aria-label={content.text[6]} id="u6p3-answer" name="answer" value={attempt.answers.answer ?? ''} maxLength={40} disabled={disabled}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
