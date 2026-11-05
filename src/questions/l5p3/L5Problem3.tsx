import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p3 } from './definition';
import './L5Problem3.css';

export interface L5P3Presentation extends PresentationPayload { renderer:'L5P3';paragraphs:string[];descriptions:string[];fieldLabels:string[]; }
export function L5Problem3({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<L5P3Presentation>(presentation,'L5P3');
  const definition=presentedDefinition(l5p3,content);
  return <div className="question-content question-content--dense l5p3-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p3-prompt">
        <p>{content.paragraphs[0]}</p>
        <p>{content.paragraphs[1]}</p>
        <p>{content.paragraphs[2]}</p>
        <p>{content.paragraphs[3]}</p>
      </div>
      <figure className="l5p3-diagram"><img src={assets.diagram1} alt={content.descriptions[0]} /></figure>
    </section>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p3-answer-fields">
        <label className="l5p3-answer type-label" htmlFor="l5p3-answer">
          <span className="sr-only">{content.fieldLabels[0]}</span>
          <AnswerInput id="l5p3-answer" name="answer" value={attempt.answers.answer ?? ''}
            maxLength={40} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
