import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u5p6 } from './definition';
import { CubaneModel } from './CubaneModel';
import './U5Problem6.css';

/** Content only: the router supplies QuestionShell and QuestionGate. */
export interface CubanePresentation extends PresentationPayload {renderer:'U5P6';paragraphs:string[];initialAngles:{yaw:number;pitch:number};atoms:{id:string;element:string;position:import('./cubaneGeometry').Vec3}[];bonds:[number,number][];modelLabel:string;modelTitle:string;answerLabel:string;unit:string;dragHint:string;}
export function U5Problem6({ attempt, onAction, presentation }: QuestionViewProps) {
 const {record:{presentation:content}}=requirePresentation<CubanePresentation>(presentation,'U5P6');
  return <div className="question-content question-content--aligned u5p6-question" data-testid="u5p6-content">
    <section className="question-brief" aria-label="Question">
      <div className="u5p6-prompt">
        <p className="type-body">{content.paragraphs[0]}</p>
        <p className="type-body">{content.paragraphs[1]}</p>
        <p className="type-body">{content.paragraphs[2]}</p>
        <p className="type-body">{content.paragraphs[3]}</p>
      </div>
      <figure className="u5p6-diagram">
        <CubaneModel content={content} />
      </figure>
    </section>
    <QuestionAnswerForm definition={presentedDefinition(u5p6,content)} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <label className="u5p6-answer type-label" htmlFor="u5p6-answer">
        <span className="sr-only">{content.answerLabel}</span>
        <AnswerInput id="u5p6-answer" name="answer" value={attempt.answers.answer ?? ''}
          inputMode="decimal" maxLength={8} unit={content.unit} disabled={disabled}
          onValueChange={value => onEdit('answer', value)} />
      </label>}
    </QuestionAnswerForm>
  </div>;
}
