import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p7 } from './definition';
import perovskite from './assets/perovskite.svg';
import gan from './assets/gan.svg';
import './L5Problem7.css';

export function L5Problem7({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--aligned l5p7-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p7-prompt">
        <p>{"The structure of giant lattices have a huge impact on their properties."}</p>
        <p>{"We represent repeating crystal structures using a unit cell. A unit cell is the smallest repeating 3-dimensional block that can be stacked to recreate the entire crystal."}</p>
        <p>{"Below are 2 materials that have or are likely to revolutionise our world. Count the total number of atoms within each unit cell (n.b. only fractions of some atoms may sit within the unit cell.)"}</p>
      </div>
      <div className="l5p7-diagrams">
        <figure><img src={perovskite} alt="Perovskite unit cell" /><figcaption className="type-body">Perovskite<br />(Used in next gen solar cells)</figcaption></figure>
        <figure><img src={gan} alt="Gallium nitride unit cell" /><figcaption className="type-body">Gallium Nitride<br />(Used in LEDs and lasers)</figcaption></figure>
      </div>
    </section>
    <QuestionAnswerForm definition={l5p7} attempt={attempt} onAction={onAction} layout="aligned">
      {({ disabled, onEdit }) => <div className="l5p7-answer-fields">
        <label className="l5p7-answer type-label" htmlFor="l5p7-perovskite">
          <span className="sr-only">Perovskite</span>
          <AnswerInput id="l5p7-perovskite" name="perovskite" value={attempt.answers.perovskite ?? ''}
            inputMode="decimal" maxLength={3} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('perovskite', value)} />
        </label>
        <label className="l5p7-answer type-label" htmlFor="l5p7-gan">
          <span className="sr-only">Gallium Nitride</span>
          <AnswerInput id="l5p7-gan" name="gan" value={attempt.answers.gan ?? ''}
            inputMode="decimal" maxLength={3} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('gan', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
