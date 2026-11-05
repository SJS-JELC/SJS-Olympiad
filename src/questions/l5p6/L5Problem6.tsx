import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p6, normaliseFormula } from './definition';
import './L5Problem6.css';

export interface L5P6Presentation extends PresentationPayload { renderer:'L5P6';paragraphs:string[];descriptions:string[];accessibleLabels:string[]; }
export function L5Problem6({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<L5P6Presentation>(presentation,'L5P6');
  const definition=presentedDefinition(l5p6,content);
  return <div className="question-content question-content--aligned l5p6-question" data-testid="l5p6-content">
    <section className="question-brief" aria-label={content.accessibleLabels[0]}>
      <div className="l5p6-brief-layout">
        <div><p>{content.paragraphs[0]}</p>
          <p>{content.paragraphs[1]}</p>
          <p>{content.paragraphs[2]}</p></div>
        <img src={assets.diagram1} alt={content.descriptions[0]} />
      </div>
    </section>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p6-answers">{definition.parts.map(part => <label key={part.id} className="type-label" htmlFor={'l5p6-' + part.id}>
        <span>{part.label}</span><AnswerInput id={'l5p6-' + part.id} name={part.id} value={attempt.answers[part.id] ?? ''}
          maxLength={12} disabled={disabled} spellCheck={false}
          onValueChange={value => onEdit(part.id, normaliseFormula(value, true))} />
      </label>)}</div>}
    </QuestionAnswerForm>
  </div>;
}
