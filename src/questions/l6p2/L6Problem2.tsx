import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p2 } from './definition';
import { wording } from './content';

import './L6Problem2.css';

export function L6Problem2({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact l6p2-question">
    <section className="question-brief" aria-label="Question">
      {wording.map((text, index) => <p className="type-body" key={index}>{text}</p>)}
    </section>
    <QuestionAnswerForm definition={l6p2} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="l6p2-answer type-label" htmlFor="l6p2-answer">
        <AnswerInput id="l6p2-answer" name="answer" aria-label="Element symbol" value={attempt.answers.answer ?? ''}
          inputMode="text" maxLength={40} disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
