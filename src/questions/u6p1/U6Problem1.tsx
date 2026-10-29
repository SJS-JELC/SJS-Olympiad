import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p1 } from './definition';
import { NmrExplorer } from './NmrExplorer';
import './U6Problem1.css';

export function U6Problem1({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--dense u6p1-question">
    <section className="question-brief" aria-label="Question">
      <p className="type-body">{"Molecular formula C₆H₁₀O₂. ¹H NMR spectrum below."}</p>
      <p className="type-body">{"The integration values (relative proton ratios) are shown in red."}</p>
      <p className="type-body">{"Name the molecule."}</p>
      <NmrExplorer />
    </section>
    <QuestionAnswerForm layout="aligned" definition={u6p1} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p1-answers">
        <label className="u6p1-answer type-label" htmlFor="u6p1-answer">
          <AnswerInput aria-label="Molecule name" id="u6p1-answer" name="answer" value={attempt.answers.answer ?? ''} maxLength={40} disabled={disabled}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
