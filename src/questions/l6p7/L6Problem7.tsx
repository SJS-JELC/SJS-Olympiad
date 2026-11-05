import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p7 } from './definition';
import { requirePresentation, presentedDefinition } from '../../contracts/presentation';
import type { L6P7Presentation } from './content';
import './L6Problem7.css';

export function L6Problem7({ attempt, onAction, presentation }: QuestionViewProps) {
  const { record: { presentation: content }, assets } = requirePresentation<L6P7Presentation>(presentation, 'L6P7');
  const definition = presentedDefinition(l6p7, content);
  return <div className="question-content question-content--aligned l6p7-question">
    <section className="question-brief" aria-label="Question">
      <div className="l6p7-content-row"><p className="type-body">{content.paragraphs[0]}</p><img src={assets[content.diagrams[0].assetId]} alt={content.diagrams[0].description} /></div>
      <div className="l6p7-content-row"><p className="type-body">{content.paragraphs[1]}</p><img src={assets[content.diagrams[1].assetId]} alt={content.diagrams[1].description} /></div>
    </section>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="l6p7-answer type-label" htmlFor="l6p7-answer">
        <AnswerInput id="l6p7-answer" name="answer" aria-label={definition.parts[0].fields[0].ariaLabel ?? definition.parts[0].fields[0].label} value={attempt.answers.answer ?? ''}
          inputMode="text" maxLength={40} disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
