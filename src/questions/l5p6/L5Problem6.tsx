import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p6, normaliseFormula } from './definition';
import methionine from './assets/methionine.svg';
import './L5Problem6.css';

export function L5Problem6({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--aligned l5p6-question" data-testid="l5p6-content">
    <section className="question-brief" aria-label="Question and molecule">
      <div className="l5p6-brief-layout">
        <div><p>One method chemists use to study molecules is to break them into smaller fragments and measure the mass of each fragment.</p>
          <p>When the molecule shown is fragmented, ions with masses 47.1, 74 and 45 are detected.</p>
          <p>Deduce the formula of the fragment that could produce each mass.</p></div>
        <img src={methionine} alt="Methionine structural formula" />
      </div>
    </section>
    <QuestionAnswerForm definition={l5p6} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p6-answers">{l5p6.parts.map(part => <label key={part.id} className="type-label" htmlFor={'l5p6-' + part.id}>
        <span>{part.label}</span><AnswerInput id={'l5p6-' + part.id} name={part.id} value={attempt.answers[part.id] ?? ''}
          maxLength={12} disabled={disabled} spellCheck={false}
          onValueChange={value => onEdit(part.id, normaliseFormula(value, true))} />
      </label>)}</div>}
    </QuestionAnswerForm>
  </div>;
}
