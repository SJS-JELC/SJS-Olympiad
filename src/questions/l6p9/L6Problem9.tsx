import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l6p9 } from './definition';
import { requirePresentation, presentedDefinition } from '../../contracts/presentation';
import type { L6P9Presentation } from './content';
import './L6Problem9.css';

export function L6Problem9({ attempt, onAction, presentation }: QuestionViewProps) {
  const { record: { presentation: content }, assets } = requirePresentation<L6P9Presentation>(presentation, 'L6P9');
  const definition = presentedDefinition(l6p9, content);
  return <div className="question-content question-content--aligned l6p9-question">
    <section className="question-brief" aria-label="Question">
      {content.paragraphs.map((text, index) => <p className="type-body" key={index}>{text}</p>)}
      <div className="l6p9-diagrams"><img src={assets[content.diagrams[0].assetId]} alt={content.diagrams[0].description} /><img src={assets[content.diagrams[1].assetId]} alt={content.diagrams[1].description} /></div>
    </section>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="l6p9-answer type-label" htmlFor="l6p9-answer">
        <AnswerInput id="l6p9-answer" name="answer" aria-label={definition.parts[0].fields[0].ariaLabel ?? definition.parts[0].fields[0].label} value={attempt.answers.answer ?? ''}
          inputMode="decimal" maxLength={3} disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
