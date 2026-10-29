import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p1 } from './definition';
import equipment9 from './assets/equipment-9.png';
import equipment4 from './assets/equipment-4.png';
import './L5Problem1.css';

export function L5Problem1({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--compact l5p1-question">
    <img className="l5p1-dressing l5p1-dressing-left" src={equipment9} alt="" aria-hidden="true" />
    <img className="l5p1-dressing l5p1-dressing-right" src={equipment4} alt="" aria-hidden="true" />
    <section className="question-brief" aria-label="Question">
      <div className="l5p1-prompt">
        <p>A metal carbonate, M₂(CO₃)₃, loses 46.8% of its mass when heated.</p>
        <p>Give the name of the metal, M?</p>
      </div>
    </section>
    <QuestionAnswerForm definition={l5p1} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p1-answer">
        <AnswerInput id="l5p1-answer" name="answer" aria-label="Name of the metal, M" value={attempt.answers.answer ?? ''}
          maxLength={40} disabled={disabled} autoComplete="off" spellCheck={false}
          onValueChange={value => onEdit('answer', value)} />
      </div>}
    </QuestionAnswerForm>
  </div>;
}
