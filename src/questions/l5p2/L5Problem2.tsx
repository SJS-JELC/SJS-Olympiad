import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p2 } from './definition';

import './L5Problem2.css';

export function L5Problem2({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact l5p2-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p2-prompt">
        <p>{"Nuclear fusion is easiest to achieve using ²H (deuterium) and ³H (tritium)."}</p>
        <p>{"Deuterium is quite easy to obtain from natural sources, but tritium must be made by adding a neutron to a ⁶Li atom. To obtain this we enrich naturally occurring lithium until, by mass, 50% of it is ⁶Li."}</p>
        <p>{"What is the relative atomic mass of this enriched lithium? Give your answer to 3 significant figures."}</p>
        <p>{"For interest:"}</p>
        <p>{"²H + ³H → ⁴He + ¹n"}</p>
        <p>{"⁶Li + ¹n → ⁴He + ³H"}</p>
      </div>

    </section>
    <QuestionAnswerForm definition={l5p2} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p2-answer-fields">
        <label className="l5p2-answer type-label" htmlFor="l5p2-answer">
          <span className="sr-only">Relative atomic mass</span>
          <AnswerInput id="l5p2-answer" name="answer" value={attempt.answers.answer ?? ''}
            inputMode="decimal" maxLength={6} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
