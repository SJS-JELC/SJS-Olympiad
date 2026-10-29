import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p9 } from './definition';
import { wording } from './content';
import diagram0 from './assets/flat-cyclohexane.svg';
import diagram1 from './assets/chair-cyclohexane.svg';
import './L6Problem9.css';

export function L6Problem9({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--aligned l6p9-question">
    <section className="question-brief" aria-label="Question">
      {wording.map((text, index) => <p className="type-body" key={index}>{text}</p>)}
      <div className="l6p9-diagrams"><img src={diagram0} alt="Flat cyclohexane structure with supplied dimensions" /><img src={diagram1} alt="Chair cyclohexane structure with points a and b" /></div>
    </section>
    <QuestionAnswerForm definition={l6p9} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="l6p9-answer type-label" htmlFor="l6p9-answer">
        <AnswerInput id="l6p9-answer" name="answer" aria-label="Distance between a and b in pm" value={attempt.answers.answer ?? ''}
          inputMode="decimal" maxLength={3} disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
