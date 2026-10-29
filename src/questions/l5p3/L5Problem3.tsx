import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p3 } from './definition';
import bicyclo from './assets/bicyclo.svg';
import './L5Problem3.css';

export function L5Problem3({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--dense l5p3-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p3-prompt">
        <p>{"It is easier to display organic molecules as skeletal formula. Skeletal formulae follow these rules:"}</p>
        <p>{"Each line represents a bond between two carbon atoms | Each corner or end of a line represents a carbon atom | Hydrogen atoms attached to carbon are not shown but are implied."}</p>
        <p>{"The names of 3 of the molecules below are bicyclo[2.2.1]heptane, bicyclo[2.2.2]octane, bicyclo[3.2.1]octane."}</p>
        <p>{"Deduce the name of the other molecule."}</p>
      </div>
      <figure className="l5p3-diagram"><img src={bicyclo} alt="Four bicyclic skeletal structures to compare" /></figure>
    </section>
    <QuestionAnswerForm definition={l5p3} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p3-answer-fields">
        <label className="l5p3-answer type-label" htmlFor="l5p3-answer">
          <span className="sr-only">Name of the other molecule</span>
          <AnswerInput id="l5p3-answer" name="answer" value={attempt.answers.answer ?? ''}
            maxLength={40} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
