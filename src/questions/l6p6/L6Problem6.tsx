import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p6 } from './definition';
import { wording } from './content';

import './L6Problem6.css';

export function L6Problem6({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact l6p6-question">
    <section className="question-brief" aria-label="Question">
      {wording.map((text, index) => <p className="type-body" key={index}>{text}</p>)}
    </section>
    <QuestionAnswerForm definition={l6p6} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="l6p6-answer type-label" htmlFor="l6p6-answer">
        <AnswerInput id="l6p6-answer" name="answer" aria-label="Number of organic molecules" value={attempt.answers.answer ?? ''}
          inputMode="decimal" maxLength={2} disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
