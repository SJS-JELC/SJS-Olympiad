import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p2 } from './definition';

import './U6Problem2.css';

export function U6Problem2({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact u6p2-question">
    <section className="question-brief" aria-label="Question">
      <p className="type-body">{"A 75 g block of copper at 150 °C is dropped into 100 g of water at 20 °C in a perfectly insulated container."}</p>
      <p className="type-body">{"After a while, the copper and the water reach a constant temperature T."}</p>
      <p className="type-body">{"The specific heat capacity of copper is 0.39 J g⁻¹ °C⁻¹."}</p>
      <p className="type-body">{"The specific heat capacity of water is 4.18 J g⁻¹ °C⁻¹."}</p>
      <p className="type-body">{"Calculate the final temperature in °C, to 3 significant figures, assuming no heat is lost to the surroundings."}</p>
      
    </section>
    <QuestionAnswerForm layout="compact" definition={u6p2} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p2-answers">
        <label className="u6p2-answer type-label" htmlFor="u6p2-answer">
          <AnswerInput aria-label="Final temperature (°C)" unit="°C" id="u6p2-answer" name="answer" value={attempt.answers.answer ?? ''} inputMode="decimal" maxLength={6} disabled={disabled}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
