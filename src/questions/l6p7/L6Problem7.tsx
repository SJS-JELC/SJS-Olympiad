import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p7 } from './definition';
import { wording } from './content';
import diagram0 from './assets/diels-alder-example.svg';
import diagram1 from './assets/diels-alder-target.svg';
import './L6Problem7.css';

export function L6Problem7({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--aligned l6p7-question">
    <section className="question-brief" aria-label="Question">
      <div className="l6p7-content-row"><p className="type-body">{wording[0]}</p><img src={diagram0} alt="Diels-Alder example: ethene and 1,3-butadiene form cyclohexene" /></div>
      <div className="l6p7-content-row"><p className="type-body">{wording[1]}</p><img src={diagram1} alt="Diels-Alder target molecule" /></div>
    </section>
    <QuestionAnswerForm definition={l6p7} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="l6p7-answer type-label" htmlFor="l6p7-answer">
        <AnswerInput id="l6p7-answer" name="answer" aria-label="Name of the other molecule" value={attempt.answers.answer ?? ''}
          inputMode="text" maxLength={40} disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
