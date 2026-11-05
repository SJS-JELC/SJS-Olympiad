import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p5 } from './definition';
import './L5Problem5.css';

export interface L5P5Presentation extends PresentationPayload { renderer:'L5P5';paragraphs:string[];descriptions:string[];fieldLabels:string[]; }
export function L5Problem5({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<L5P5Presentation>(presentation,'L5P5');
  const definition=presentedDefinition(l5p5,content);
  return <div className="question-content question-content--aligned l5p5-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p5-prompt">
        <p>{content.paragraphs[0]}</p>
      </div>
      <div className="l5p5-illustrations">
        <figure><img src={assets.diagram1} alt={content.descriptions[0]} /></figure>
        <figure><img src={assets.diagram2} alt={content.descriptions[1]} /></figure>
        <figure><img src={assets.diagram3} alt={content.descriptions[2]} /></figure>
      </div>
    </section>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction} layout="aligned">
      {({ disabled, onEdit }) => <div className="l5p5-answer-fields">
        <label className="l5p5-answer type-label" htmlFor={'l5p5-'+definition.parts[0].fields[0].id}>
          <span className="sr-only">{content.fieldLabels[0]}</span>
          <AnswerInput id={'l5p5-'+definition.parts[0].fields[0].id} name={definition.parts[0].fields[0].id} value={attempt.answers[definition.parts[0].fields[0].id] ?? ''}
            inputMode="decimal" maxLength={2} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit(definition.parts[0].fields[0].id, value)} />
        </label>
        <label className="l5p5-answer type-label" htmlFor={'l5p5-'+definition.parts[0].fields[1].id}>
          <span className="sr-only">{content.fieldLabels[1]}</span>
          <AnswerInput id={'l5p5-'+definition.parts[0].fields[1].id} name={definition.parts[0].fields[1].id} value={attempt.answers[definition.parts[0].fields[1].id] ?? ''}
            inputMode="decimal" maxLength={2} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit(definition.parts[0].fields[1].id, value)} />
        </label>
        <label className="l5p5-answer type-label" htmlFor={'l5p5-'+definition.parts[0].fields[2].id}>
          <span className="sr-only">{content.fieldLabels[2]}</span>
          <AnswerInput id={'l5p5-'+definition.parts[0].fields[2].id} name={definition.parts[0].fields[2].id} value={attempt.answers[definition.parts[0].fields[2].id] ?? ''}
            inputMode="decimal" maxLength={2} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit(definition.parts[0].fields[2].id, value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
