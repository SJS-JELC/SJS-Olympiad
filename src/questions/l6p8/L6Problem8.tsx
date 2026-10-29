import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p8 } from './definition';
import { wording } from './content';

import './L6Problem8.css';

export function L6Problem8({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact l6p8-question">
    <section className="question-brief" aria-label="Question">
      {wording.map((text, index) => <p className="type-body" key={index}>{text}</p>)}
    </section>
    <QuestionAnswerForm definition={l6p8} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="l6p8-answer type-label" htmlFor="l6p8-answer">
        <AnswerInput id="l6p8-answer" name="answer" aria-label="Equilibrium concentration of B" value={attempt.answers.answer ?? ''}
          inputMode="decimal" maxLength={6} disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
