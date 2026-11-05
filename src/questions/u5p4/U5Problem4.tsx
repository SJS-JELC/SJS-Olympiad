import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u5p4 } from './definition';
import './U5Problem4.css';

export interface RingsPresentation extends PresentationPayload {renderer:'U5P4';paragraphs:string[];bullets:string[];diagramLabel:string;answerLabel:string;}
export function U5Problem4({ attempt, onAction, presentation }: QuestionViewProps) {
 const {record:{presentation:content},assets}=requirePresentation<RingsPresentation>(presentation,'U5P4');
  return <div className="question-content question-content--aligned u5p4-question" data-testid="u5p4-content">
    <section className="question-brief u5p4-brief" aria-label="Question">
      <div className="u5p4-prompt type-body">
        <p>{content.paragraphs[0]}</p>
        <ul>
          <li>{content.bullets[0]}</li>
          <li>{content.bullets[1]}</li>
          <li>{content.bullets[2]}</li>
        </ul>
        <p>{content.paragraphs[1]}</p>
        <p>{content.paragraphs[2]}</p>
        <p>{content.paragraphs[3]}</p>
      </div>
      <img className="u5p4-diagram" src={assets.molecules} alt={content.diagramLabel} />
    </section>
    <QuestionAnswerForm definition={presentedDefinition(u5p4,content)} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <AnswerInput id="u5p4-answer" name="answer" aria-label={content.answerLabel}
        value={attempt.answers.answer ?? ''} maxLength={80} disabled={disabled}
        onValueChange={value => onEdit('answer', value)} />}
    </QuestionAnswerForm>
  </div>;
}
