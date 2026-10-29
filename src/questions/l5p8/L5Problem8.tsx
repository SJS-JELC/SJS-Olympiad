import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p8 } from './definition';

import './L5Problem8.css';

export function L5Problem8({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact l5p8-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p8-prompt">
        <p>{"Alkanes have the general formula CₙH₂ₙ₊₂."}</p>
        <p>{"Carbon exists naturally as a mixture of isotopes: 98.9% ¹²C and 1.1% ¹³C."}</p>
        <p>{"For larger alkanes, molecules with Mᵣ + 1 arise when exactly one carbon atom is ¹³C and the remaining carbons are ¹²C."}</p>
        <p>{"Assume they contain only H. For what value of n will the abundance at Mᵣ equal the abundance at Mᵣ + 1?"}</p>
      </div>
    </section>
    <QuestionAnswerForm definition={l5p8} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p8-answer-fields">
        <label className="l5p8-answer type-label" htmlFor="l5p8-answer">
          <span className="sr-only">n =</span>
          <AnswerInput id="l5p8-answer" name="answer" value={attempt.answers.answer ?? ''}
            inputMode="decimal" maxLength={6} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
