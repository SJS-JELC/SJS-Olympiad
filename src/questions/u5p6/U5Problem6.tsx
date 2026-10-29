import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u5p6 } from './definition';
import { CubaneModel } from './CubaneModel';
import './U5Problem6.css';

/** Content only: the router supplies QuestionShell and QuestionGate. */
export function U5Problem6({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--aligned u5p6-question" data-testid="u5p6-content">
    <section className="question-brief" aria-label="Question">
      <div className="u5p6-prompt">
        <p className="type-body">The molecule shown, C₈H₈, is called cubane, for fairly obvious reasons.</p>
        <p className="type-body">C–C bonds are 154 pm long and C–H bonds are 109 pm.</p>
        <p className="type-body">Calculate the greatest possible distance between any two hydrogen atoms in a molecule of cubane.</p>
        <p className="type-body">Give your answer to the nearest pm.</p>
      </div>
      <figure className="u5p6-diagram">
        <CubaneModel />
      </figure>
    </section>
    <QuestionAnswerForm definition={u5p6} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="u5p6-answer type-label" htmlFor="u5p6-answer">
        <span className="sr-only">Greatest hydrogen separation in pm</span>
        <AnswerInput id="u5p6-answer" name="answer" value={attempt.answers.answer ?? ''}
          inputMode="decimal" maxLength={8} unit="pm" disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
