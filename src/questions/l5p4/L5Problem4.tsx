import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p4 } from './definition';
import './L5Problem4.css';

export interface L5P4Presentation extends PresentationPayload { renderer:'L5P4';paragraphs:string[];fieldLabels:string[]; }
export function L5Problem4({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content}}=requirePresentation<L5P4Presentation>(presentation,'L5P4');
  const definition=presentedDefinition(l5p4,content);
  return <div className="question-content question-content--compact l5p4-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p4-prompt">
        <p>{content.paragraphs[0]}</p>
        <p>{content.paragraphs[1]}</p>
        <p>{content.paragraphs[2]}</p>
        <p>{content.paragraphs[3]}</p>
        <p>{content.paragraphs[4]}</p>
      </div>
    </section>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p4-answer-fields">
        <label className="l5p4-answer type-label" htmlFor="l5p4-answer">
          <span className="sr-only">{content.fieldLabels[0]}</span>
          <AnswerInput id="l5p4-answer" name="answer" value={attempt.answers.answer ?? ''}
            maxLength={40} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
