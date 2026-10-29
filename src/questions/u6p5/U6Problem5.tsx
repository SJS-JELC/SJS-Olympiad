import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p5 } from './definition';
import diagram0 from './assets/stereoisomers.svg';
import './U6Problem5.css';

export function U6Problem5({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--dense u6p5-question">
    <section className="question-brief" aria-label="Question">
      <p className="type-body">{"Stereoisomerism makes your head hurt when there is more than 1 chiral centre."}</p>
      <p className="type-body">{"3,4,5-trimethylheptane has 2 (or maybe 3) chiral centres but only 4 stereoisomers."}</p>
      <p className="type-body">{"Of these stereoisomers there is only 1 pair of enantiomers. Find the pair."}</p>
      <figure className="u6p5-diagram"><img src={diagram0} alt="Four stereoisomers of 3,4,5-trimethylheptane, labelled A to D from left to right." /><figcaption className="u6p5-molecule-labels type-label"><span>A</span><span>B</span><span>C</span><span>D</span></figcaption></figure>
    </section>
    <QuestionAnswerForm layout="compact" definition={u6p5} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p5-answers">
        <label className="u6p5-answer type-label" htmlFor="u6p5-first">
          <AnswerInput aria-label="First enantiomer" id="u6p5-first" name="first" value={attempt.answers.first ?? ''} maxLength={4} disabled={disabled}
            onValueChange={value => onEdit('first', value)} />
        </label>
        <span className="type-label" aria-hidden="true">+</span>
        <label className="u6p5-answer type-label" htmlFor="u6p5-second">
          <AnswerInput aria-label="Second enantiomer" id="u6p5-second" name="second" value={attempt.answers.second ?? ''} maxLength={1} disabled={disabled}
            onValueChange={value => onEdit('second', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
