import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p4 } from './definition';
import './L5Problem4.css';

export function L5Problem4({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact l5p4-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p4-prompt">
        <p>{"Give the symbol of the mystery element?"}</p>
        <p>{"- It is named after the German word for goblin as miners blamed goblins when its ores released poisonous arsenic fumes when heated."}</p>
        <p>{"- It is one of the few elements that will be strongly attracted to a magnet at room temperature."}</p>
        <p>{"- Its compounds produce a deep blue colour in glass and ceramics."}</p>
        <p>{"- It is found in the important biological molecule vitamin B₁₂."}</p>
      </div>
    </section>
    <QuestionAnswerForm definition={l5p4} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p4-answer-fields">
        <label className="l5p4-answer type-label" htmlFor="l5p4-answer">
          <span className="sr-only">Symbol of the mystery element</span>
          <AnswerInput id="l5p4-answer" name="answer" value={attempt.answers.answer ?? ''}
            maxLength={40} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
