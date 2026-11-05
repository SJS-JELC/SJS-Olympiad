import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { l5p1 } from './definition';
import './L5Problem1.css';

export interface L5P1Presentation extends PresentationPayload { renderer:'L5P1';paragraphs:string[];accessibleLabels:string[]; }
export function L5Problem1({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<L5P1Presentation>(presentation,'L5P1');
  const definition=presentedDefinition(l5p1,content);
  return <div className="question-content question-content--compact l5p1-question">
    <img className="l5p1-dressing l5p1-dressing-left" src={assets.equipment9} alt="" aria-hidden="true" />
    <img className="l5p1-dressing l5p1-dressing-right" src={assets.equipment4} alt="" aria-hidden="true" />
    <section className="question-brief" aria-label="Question">
      <div className="l5p1-prompt">
        <p>{content.paragraphs[0]}</p>
        <p>{content.paragraphs[1]}</p>
      </div>
    </section>
    <QuestionAnswerForm definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="l5p1-answer">
        <AnswerInput id="l5p1-answer" name="answer" aria-label={content.accessibleLabels[0]} value={attempt.answers.answer ?? ''}
          maxLength={40} disabled={disabled} autoComplete="off" spellCheck={false}
          onValueChange={value => onEdit('answer', value)} />
      </div>}
    </QuestionAnswerForm>
  </div>;
}
