import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p3 } from './definition';
import diagram0 from './assets/spiros.svg';
import './U6Problem3.css';

export function U6Problem3({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--dense u6p3-question">
    <section className="question-brief" aria-label="Question">
      <p className="type-body">{"3 members of a molecular family are shown below. The names of two are:"}</p>
      <p className="type-body">{"6,8-dimethylspiro[3.5]nonane and"}</p>
      <p className="type-body">{"4-chloro-7-fluoro-5,6-dimethylspiro[2.4]heptane."}</p>
      <p className="type-body">{"What is the other called?"}</p>
      <figure className="u6p3-diagram"><img src={diagram0} alt="Three spiro molecules, including the two named examples and the molecule to name." /></figure>
    </section>
    <QuestionAnswerForm layout="compact" definition={u6p3} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p3-answers">
        <label className="u6p3-answer type-label" htmlFor="u6p3-answer">
          <AnswerInput aria-label="Molecule name" id="u6p3-answer" name="answer" value={attempt.answers.answer ?? ''} maxLength={40} disabled={disabled}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
