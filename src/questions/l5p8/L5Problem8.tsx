import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p8 } from './definition';

import './L5Problem8.css';

export interface L5P8Presentation extends PresentationPayload { renderer:'L5P8';paragraphs:string[];fieldLabels:string[]; }
export function L5Problem8({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content}}=requirePresentation<L5P8Presentation>(presentation,'L5P8');
  const definition=presentedDefinition(l5p8,content);
  return <div className="question-content question-content--compact l5p8-question">
    <section className="question-brief" aria-label="Question">
      <div className="l5p8-prompt">
        <p>{content.paragraphs[0]}</p>
        <p>{content.paragraphs[1]}</p>
        <p>{content.paragraphs[2]}</p>
        <p>{content.paragraphs[3]}</p>
      </div>
    </section>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p8-answer-fields">
        <label className="l5p8-answer type-label" htmlFor="l5p8-answer">
          <span className="sr-only">{content.fieldLabels[0]}</span>
          <AnswerInput id="l5p8-answer" name="answer" value={attempt.answers.answer ?? ''}
            inputMode="decimal" maxLength={6} disabled={disabled} autoComplete="off" spellCheck={false}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
