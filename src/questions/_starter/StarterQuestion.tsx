import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { starterDefinition } from './definition';
import './StarterQuestion.css';

/** Content view only. The router supplies QuestionShell and QuestionGate. */
export function StarterQuestion({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact starter-question">
    <section className="question-brief" aria-label="Question">
      <p>Example only: enter forty-two as a number.</p>
      {/* Place authored content and sourced diagrams here. */}
    </section>
    <QuestionAnswerForm definition={starterDefinition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="starter-answer type-label" htmlFor="starter-answer">
        <span className="sr-only">Answer</span>
        <AnswerInput id="starter-answer" name="answer" value={attempt.answers.answer ?? ''}
          inputMode="numeric" maxLength={3} disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
