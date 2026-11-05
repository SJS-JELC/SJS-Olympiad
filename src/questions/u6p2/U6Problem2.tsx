export interface U6P2Presentation extends PresentationPayload { renderer:'U6P2';text:string[]; }
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p2 } from './definition';

import './U6Problem2.css';

export function U6Problem2({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<U6P2Presentation>(presentation,'U6P2');
  const definition=presentedDefinition(u6p2,content);
  return <div className="question-content question-content--compact u6p2-question">
    <section className="question-brief" aria-label={content.text[0]}>
      <p className="type-body">{content.text[1]}</p>
      <p className="type-body">{content.text[2]}</p>
      <p className="type-body">{content.text[3]}</p>
      <p className="type-body">{content.text[4]}</p>
      <p className="type-body">{content.text[5]}</p>
      
    </section>
    <QuestionAnswerForm layout="compact" definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p2-answers">
        <label className="u6p2-answer type-label" htmlFor="u6p2-answer">
          <AnswerInput aria-label={content.text[6]} unit={content.text[7]} id="u6p2-answer" name="answer" value={attempt.answers.answer ?? ''} inputMode="decimal" maxLength={6} disabled={disabled}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
