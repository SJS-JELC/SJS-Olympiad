export interface U6P6Presentation extends PresentationPayload { renderer:'U6P6';text:string[]; }
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p6 } from './definition';

import './U6Problem6.css';

export function U6Problem6({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<U6P6Presentation>(presentation,'U6P6');
  const definition=presentedDefinition(u6p6,content);
  return <div className="question-content question-content--compact u6p6-question">
    <section className="question-brief" aria-label={content.text[0]}>
      <p className="type-body">{content.text[1]}<sup>{content.text[2]}</sup>{content.text[3]}</p>
      <p className="type-body">{content.text[4]}<sup>{content.text[5]}</sup>{content.text[6]}<sup>{content.text[7]}</sup>{content.text[8]}</p>
      <p className="type-body">{content.text[9]}</p>
      
    </section>
    <QuestionAnswerForm layout="compact" definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p6-answers">
        <label className="u6p6-answer type-label" htmlFor="u6p6-answer">
          <AnswerInput aria-label={content.text[10]} id="u6p6-answer" name="answer" value={attempt.answers.answer ?? ''} inputMode="decimal" maxLength={8} disabled={disabled}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
