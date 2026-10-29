import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p7 } from './definition';

import './U6Problem7.css';

export function U6Problem7({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact u6p7-question">
    <section className="question-brief" aria-label="Question">
      <p className="type-body">I am propane, C<sub>3</sub>H<sub>8</sub>.</p>
      <p className="type-body">{"Three carbon atoms stand in a chain, each arranged with ideal tetrahedral geometry."}</p>
      <p className="type-body">{"One hydrogen is attached to the first carbon."}</p>
      <p className="type-body">{"Another is attached to the third."}</p>
      <p className="type-body">{"Through space, how close can these two hydrogens come?"}</p>
      <p className="type-body">{"C-C bond length = 154 pm"}</p>
      <p className="type-body">{"C-H bond length = 109 pm"}</p>
      <p className="type-body">{"Give your answer in picometres (pm), correct to 3 significant figures."}</p>
      
    </section>
    <QuestionAnswerForm layout="compact" definition={u6p7} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p7-answers">
        <label className="u6p7-answer type-label" htmlFor="u6p7-answer">
          <AnswerInput aria-label="Distance (pm)" unit="pm" id="u6p7-answer" name="answer" value={attempt.answers.answer ?? ''} inputMode="decimal" maxLength={4} disabled={disabled}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
