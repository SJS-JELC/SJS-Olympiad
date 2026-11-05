import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p2 } from './definition';
import { requirePresentation, presentedDefinition } from '../../contracts/presentation';
import type { L6P2Presentation } from './content';

import './L6Problem2.css';

export function L6Problem2({ attempt, onAction, presentation }: QuestionViewProps) {
  const { record: { presentation: content }, assets } = requirePresentation<L6P2Presentation>(presentation, 'L6P2');
  const definition = presentedDefinition(l6p2, content);
  return <div className="question-content question-content--compact l6p2-question">
    <section className="question-brief" aria-label="Question">
      {content.paragraphs.map((text, index) => <p className="type-body" key={index}>{text}</p>)}
    </section>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="l6p2-answer type-label" htmlFor="l6p2-answer">
        <AnswerInput id="l6p2-answer" name="answer" aria-label={definition.parts[0].fields[0].ariaLabel ?? definition.parts[0].fields[0].label} value={attempt.answers.answer ?? ''}
          inputMode="text" maxLength={40} disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
