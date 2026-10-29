import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p5 } from './definition';
import c2h4o from './assets/c2h4o.svg';
import c4h8 from './assets/c4h8.svg';
import c3h9n from './assets/c3h9n.svg';
import './L5Problem5.css';

export function L5Problem5({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--aligned l5p5-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p5-prompt">
        <p>{"How many isomers do molecules with the following molecular formulae have?"}</p>
      </div>
      <div className="l5p5-formulae">
        <figure><img src={c2h4o} alt="C₂H₄O" /></figure>
        <figure><img src={c4h8} alt="C₄H₈" /></figure>
        <figure><img src={c3h9n} alt="C₃H₉N" /></figure>
      </div>
    </section>
    <QuestionAnswerForm definition={l5p5} attempt={attempt} onAction={onAction} layout="aligned">
      {({ disabled, onEdit }) => <div className="l5p5-answer-fields">
        <label className="l5p5-answer type-label" htmlFor="l5p5-c2h4o">
          <span className="sr-only">C₂H₄O</span>
          <AnswerInput id="l5p5-c2h4o" name="c2h4o" value={attempt.answers.c2h4o ?? ''}
            inputMode="decimal" maxLength={2} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('c2h4o', value)} />
        </label>
        <label className="l5p5-answer type-label" htmlFor="l5p5-c4h8">
          <span className="sr-only">C₄H₈</span>
          <AnswerInput id="l5p5-c4h8" name="c4h8" value={attempt.answers.c4h8 ?? ''}
            inputMode="decimal" maxLength={2} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('c4h8', value)} />
        </label>
        <label className="l5p5-answer type-label" htmlFor="l5p5-c3h9n">
          <span className="sr-only">C₃H₉N</span>
          <AnswerInput id="l5p5-c3h9n" name="c3h9n" value={attempt.answers.c3h9n ?? ''}
            inputMode="decimal" maxLength={2} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('c3h9n', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
