import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p7 } from './definition';
import './L5Problem7.css';

export interface L5P7Presentation extends PresentationPayload { renderer:'L5P7';paragraphs:string[];descriptions:string[];fieldLabels:string[];captions:string[][]; }
export function L5Problem7({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<L5P7Presentation>(presentation,'L5P7');
  const definition=presentedDefinition(l5p7,content);
  return <div className="question-content question-content--aligned l5p7-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p7-prompt">
        <p>{content.paragraphs[0]}</p>
        <p>{content.paragraphs[1]}</p>
        <p>{content.paragraphs[2]}</p>
      </div>
      <div className="l5p7-diagrams">
        <figure><img src={assets.diagram1} alt={content.descriptions[0]} /><figcaption className="type-body">{content.captions[0][0]}<br />{content.captions[0][1]}</figcaption></figure>
        <figure><img src={assets.diagram2} alt={content.descriptions[1]} /><figcaption className="type-body">{content.captions[1][0]}<br />{content.captions[1][1]}</figcaption></figure>
      </div>
    </section>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction} layout="aligned">
      {({ disabled, onEdit }) => <div className="l5p7-answer-fields">
        <label className="l5p7-answer type-label" htmlFor={'l5p7-'+definition.parts[0].fields[0].id}>
          <span className="sr-only">{content.fieldLabels[0]}</span>
          <AnswerInput id={'l5p7-'+definition.parts[0].fields[0].id} name={definition.parts[0].fields[0].id} value={attempt.answers[definition.parts[0].fields[0].id] ?? ''}
            inputMode="decimal" maxLength={3} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit(definition.parts[0].fields[0].id, value)} />
        </label>
        <label className="l5p7-answer type-label" htmlFor={'l5p7-'+definition.parts[0].fields[1].id}>
          <span className="sr-only">{content.fieldLabels[1]}</span>
          <AnswerInput id={'l5p7-'+definition.parts[0].fields[1].id} name={definition.parts[0].fields[1].id} value={attempt.answers[definition.parts[0].fields[1].id] ?? ''}
            inputMode="decimal" maxLength={3} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit(definition.parts[0].fields[1].id, value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
