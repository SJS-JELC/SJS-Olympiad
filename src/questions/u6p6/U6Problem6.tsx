import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p6 } from './definition';

import './U6Problem6.css';

export function U6Problem6({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact u6p6-question">
    <section className="question-brief" aria-label="Question">
      <p className="type-body">Electrospray ionisation is used to carry out mass spectrometry on a large protein and the protein becomes positively charged by gaining H<sup>+</sup> ions.</p>
      <p className="type-body">Peaks for two consecutive ions (i.e. with a charge difference of 1 e.g. 4<sup>+</sup>, 5<sup>+</sup>) are seen at m/z values of 1297 &amp; 1243.</p>
      <p className="type-body">{"Work out the molecular mass of the original protein."}</p>
      
    </section>
    <QuestionAnswerForm layout="compact" definition={u6p6} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p6-answers">
        <label className="u6p6-answer type-label" htmlFor="u6p6-answer">
          <AnswerInput aria-label="Molecular mass" id="u6p6-answer" name="answer" value={attempt.answers.answer ?? ''} inputMode="decimal" maxLength={8} disabled={disabled}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
