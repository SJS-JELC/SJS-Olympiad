import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u5p4 } from './definition';
import molecules from './assets/heterocyclic-naming-original.png';
import './U5Problem4.css';

export function U5Problem4({ attempt, onAction }: QuestionViewProps) {
  return <div className="question-content question-content--aligned u5p4-question" data-testid="u5p4-content">
    <section className="question-brief u5p4-brief" aria-label="Question">
      <div className="u5p4-prompt type-body">
        <p>Organic molecules are often shown using skeletal formulae. In these diagrams:</p>
        <ul>
          <li>each line represents a covalent bond</li>
          <li>each corner or end of a line represents a carbon atom, unless another atom is shown</li>
          <li>hydrogen atoms attached to carbon are not shown, but are implied</li>
        </ul>
        <p>The names of five of the molecules below are:</p>
        <p>1,2-diazepine, 1,3-oxazole, 1,3-diazole, 1,2-oxazine and 1,3-diazine.</p>
        <p>Use these names to work out the pattern, then name the sixth molecule.</p>
      </div>
      <img className="u5p4-molecules" src={molecules} alt="Six skeletal ring structures, traced around each ring; single lines are single bonds and equals signs are double bonds. Top left: O–C=N–C=C (closed to O). Top middle: O–C=C–N=C–C=C (closed to O). Top right: N=C–C=C–N=C (closed to N). Bottom left: O–N=C–C=C–C (closed to O). Bottom middle: NH–C=N–C=C (closed to NH). Bottom right: NH–N=C–C=C–C=C (closed to NH)." />
    </section>
    <QuestionAnswerForm definition={u5p4} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <AnswerInput id="u5p4-answer" name="answer" aria-label="Name of the sixth molecule"
        value={attempt.answers.answer ?? ''} maxLength={80} disabled={disabled}
        onValueChange={value => onEdit('answer', value)} />}
    </QuestionAnswerForm>
  </div>;
}
