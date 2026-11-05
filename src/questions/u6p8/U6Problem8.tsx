export interface U6P8Presentation extends PresentationPayload { renderer:'U6P8';text:string[];annotation:{viewBox:string;x:number;y:number}; }
import { requirePresentation, presentedDefinition, type PresentationPayload } from '../../contracts/presentation';
import type { QuestionViewProps } from '../catalog';
import { AnswerInput } from '../AnswerInput';
import { QuestionAnswerForm } from '../QuestionAnswerForm';
import { u6p8 } from './definition';
import './U6Problem8.css';

export function U6Problem8({ attempt, onAction, presentation }: QuestionViewProps) {
  const {record:{presentation:content},assets}=requirePresentation<U6P8Presentation>(presentation,'U6P8');
  const definition=presentedDefinition(u6p8,content);
  const [first,second]=definition.parts[0].fields;
  return <div className="question-content question-content--dense u6p8-question">
    <section className="question-brief" aria-label={content.text[0]}>
      <p className="type-body">{content.text[1]}</p>
      <p className="type-body">{content.text[2]}</p>
      <table className="u6p8-table type-body" aria-label={content.text[3]}>
        <thead><tr><th scope="col">{content.text[4]}</th><th scope="col">{content.text[5]}<sup>{content.text[6]}</sup></th><th scope="col">{content.text[7]}<sup>{content.text[8]}</sup>{content.text[9]}<sup>{content.text[10]}</sup></th><th scope="col">{content.text[11]}<sup>{content.text[12]}</sup>{content.text[13]}<sup>{content.text[14]}</sup></th></tr></thead>
        <tbody>
          <tr><th scope="row">{content.text[15]}</th><td>{content.text[16]}</td><td>{content.text[17]}</td><td>{content.text[18]}<sup>{content.text[19]}</sup></td></tr>
          <tr><th scope="row">{content.text[20]}</th><td>{content.text[21]}</td><td>{content.text[22]}</td><td>{content.text[23]}<sup>{content.text[24]}</sup></td></tr>
          <tr><th scope="row">{content.text[25]}</th><td>{content.text[26]}</td><td>{content.text[27]}</td><td>{content.text[28]}<sup>{content.text[29]}</sup></td></tr>
        </tbody>
      </table>
      <div className="u6p8-diagrams">
      <figure className="u6p8-diagram u6p8-diagram-1"><figcaption className="type-label">{content.text[30]}</figcaption><div className="u6p8-diagram-frame"><img src={assets.diagram0} alt={content.text[31]} /><svg className="u6p8-annotation" viewBox={content.annotation.viewBox} aria-hidden="true"><text className="type-label" x={content.annotation.x} y={content.annotation.y}>{content.text[32]}</text></svg></div></figure>
      <figure className="u6p8-diagram u6p8-diagram-2"><figcaption className="type-label">{content.text[33]}</figcaption><img src={assets.diagram1} alt={content.text[34]} /></figure></div>
    </section>
    <QuestionAnswerForm layout="inline" definition={definition} attempt={attempt} onAction={onAction}>
      {({ disabled, onEdit }) => <div className="u6p8-answers">
        <label className="u6p8-answer type-label" htmlFor={'u6p8-'+first.id}>
          <span>{content.text[35]}</span>
          <AnswerInput aria-label={content.text[36]} unit={content.text[37]} id={'u6p8-'+first.id} name={first.id} value={attempt.answers[first.id] ?? ''} inputMode="decimal" maxLength={6} disabled={disabled}
            onValueChange={value => onEdit(first.id, value)} />
        </label>
        <label className="u6p8-answer type-label" htmlFor={'u6p8-'+second.id}>
          <span>{content.text[38]}</span>
          <AnswerInput aria-label={content.text[39]} unit={content.text[40]} id={'u6p8-'+second.id} name={second.id} value={attempt.answers[second.id] ?? ''} inputMode="decimal" maxLength={6} disabled={disabled}
            onValueChange={value => onEdit(second.id, value)} />
        </label>
      </div>}
    </QuestionAnswerForm>
  </div>;
}
