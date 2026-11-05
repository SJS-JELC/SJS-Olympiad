export interface U6P1Presentation extends PresentationPayload { renderer:'U6P1';text:string[];detail:{width:number;height:number;detailWidth:number;initialCenter:number;labels:string[]}; }
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p1 } from './definition';
import { NmrExplorer } from './NmrExplorer';
import './U6Problem1.css';

export function U6Problem1({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<U6P1Presentation>(presentation,'U6P1');
  const definition=presentedDefinition(u6p1,content);
  return <div className="question-content question-content--dense u6p1-question">
    <section className="question-brief" aria-label={content.text[0]}>
      <p className="type-body">{content.text[1]}</p>
      <p className="type-body">{content.text[2]}</p>
      <p className="type-body">{content.text[3]}</p>
      <NmrExplorer spectrum={assets.spectrum} config={content.detail} />
    </section>
    <QuestionAnswerForm layout="aligned" definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p1-answers">
        <label className="u6p1-answer type-label" htmlFor="u6p1-answer">
          <AnswerInput aria-label={content.text[4]} id="u6p1-answer" name="answer" value={attempt.answers.answer ?? ''} maxLength={40} disabled={disabled}
            onValueChange={value => onEdit('answer', value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
