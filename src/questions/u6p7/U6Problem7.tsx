export interface U6P7Presentation extends PresentationPayload { renderer:'U6P7';text:string[]; }
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p7 } from './definition';

import './U6Problem7.css';

export function U6Problem7({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<U6P7Presentation>(presentation,'U6P7');
  const definition=presentedDefinition(u6p7,content);
  return <div className="question-content question-content--compact u6p7-question">
    <section className="question-brief" aria-label={content.text[0]}>
      <p className="type-body">{content.text[1]}<sub>{content.text[2]}</sub>{content.text[3]}<sub>{content.text[4]}</sub>{content.text[5]}</p>
      <p className="type-body">{content.text[6]}</p>
      <p className="type-body">{content.text[7]}</p>
      <p className="type-body">{content.text[8]}</p>
      <p className="type-body">{content.text[9]}</p>
      <p className="type-body">{content.text[10]}</p>
      <p className="type-body">{content.text[11]}</p>
      <p className="type-body">{content.text[12]}</p>
      
    </section>
    <QuestionAnswerForm layout="compact" definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p7-answers">
        <label className="u6p7-answer type-label" htmlFor="u6p7-answer">
          <AnswerInput aria-label={content.text[13]} unit={content.text[14]} id="u6p7-answer" name="answer" value={attempt.answers.answer ?? ''} inputMode="decimal" maxLength={4} disabled={disabled}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
